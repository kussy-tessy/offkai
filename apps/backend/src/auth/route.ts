import { randomBytes, timingSafeEqual } from "node:crypto";
import {
	ChangePasswordRequestSchema,
	SetPasswordCredentialRequestSchema,
	UpdateUserNameRequestSchema,
	User,
	type UserId,
	UserLoginIdSchema,
} from "@offkai/core";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { AppError, runBusinessRule } from "../app-error";
import { AuthSessionRepository, UserRepository } from "../repository";
import {
	changePassword,
	connectDiscord,
	disconnectDiscord,
	getMe,
	getMyDiscordProfile,
	updateUserName,
} from "../usecase";
import { setPasswordCredential } from "../usecase/auth/set-password-credential.usecase";
import {
	getDiscordAuthorizationUrl,
	getDiscordOAuthFrontendUrl,
	getDiscordUserFromCode,
} from "./discord-oauth";
import {
	createRefreshToken,
	hashRefreshToken,
	parseRefreshToken,
	refreshTokenExpiresAt,
} from "./refresh-token";

const DISCORD_OAUTH_STATE_COOKIE = "offkai_discord_oauth_state";
const DISCORD_OAUTH_FLOW_COOKIE = "offkai_discord_oauth_flow";
const REFRESH_TOKEN_COOKIE = "offkai_refresh_token";
const DISCORD_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
type DiscordOAuthFlow = "login" | "account" | "onboarding";

type RegisterBody = {
	loginId: string;
	password: string;
	name: string;
};

type LoginBody = {
	loginId: string;
	password: string;
};

export const authRoutes: FastifyPluginAsync = async (app) => {
	const authSessions = new AuthSessionRepository();

	async function issueSession(userId: UserId, reply: FastifyReply) {
		const refreshToken = createRefreshToken();
		await authSessions.create({
			id: refreshToken.sessionId,
			userId,
			refreshTokenHash: hashRefreshToken(refreshToken.secret),
			expiresAt: refreshTokenExpiresAt(),
		});
		const accessToken = await app.auth.signAccessToken({ userId });
		app.auth.setAuthCookie(reply, accessToken);
		app.auth.setRefreshCookie(reply, refreshToken.value);
	}

	app.post("/auth/register", async (request, reply) => {
		const body = (request.body ?? {}) as RegisterBody;

		const loginId = (body.loginId ?? "").trim();
		const password = body.password ?? "";
		const name = (body.name ?? "").trim();
		const loginIdValidation = UserLoginIdSchema.safeParse(loginId);

		if (!loginIdValidation.success || !password || !name) {
			throw new AppError(
				"VALIDATION_ERROR",
				"ログインID、表示名、パスワードを入力してください。",
			);
		}

		const repository = new UserRepository();
		const normalizedLoginId = loginId.toLowerCase();

		const exists = await repository.findByLoginId(normalizedLoginId);
		if (exists) {
			throw new AppError(
				"LOGIN_ID_ALREADY_EXISTS",
				"このログインIDはすでに使用されています。",
			);
		}

		const passwordHash = await bcrypt.hash(password, 12);
		const user = await repository.create(
			runBusinessRule(() =>
				User.createWithPassword({
					loginId: normalizedLoginId,
					name,
					passwordHash,
				}),
			),
		);

		await issueSession(user.id, reply);

		reply.send({ ok: true, user: toAuthUserResponse(user) });
	});

	app.post("/auth/login", async (request, reply) => {
		const body = (request.body ?? {}) as LoginBody;

		const loginId = (body.loginId ?? "").trim();
		const password = body.password ?? "";

		if (!loginId || !password) {
			throw new AppError(
				"VALIDATION_ERROR",
				"ログインIDとパスワードを入力してください。",
			);
		}

		const normalizedLoginId = loginId.toLowerCase();
		const user = await new UserRepository().findByLoginId(normalizedLoginId);

		if (!user) {
			throw new AppError(
				"INVALID_CREDENTIALS",
				"ログインIDまたはパスワードが正しくありません。",
			);
		}

		const ok = user.passwordHash
			? await bcrypt.compare(password, user.passwordHash)
			: false;
		if (!ok) {
			throw new AppError(
				"INVALID_CREDENTIALS",
				"ログインIDまたはパスワードが正しくありません。",
			);
		}

		await issueSession(user.id, reply);

		reply.send({ ok: true, user: toAuthUserResponse(user) });
	});

	app.post("/auth/refresh", async (request, reply) => {
		assertTrustedOrigin(request.headers.origin);
		const currentToken = parseRefreshToken(
			request.cookies[REFRESH_TOKEN_COOKIE],
		);
		if (!currentToken) return rejectRefresh();

		const userId = await authSessions.findUserId(currentToken.sessionId);
		if (!userId) return rejectRefresh();

		const nextToken = createRefreshToken(currentToken.sessionId);
		const rotated = await authSessions.rotate({
			id: currentToken.sessionId,
			currentTokenHash: hashRefreshToken(currentToken.secret),
			newTokenHash: hashRefreshToken(nextToken.secret),
			expiresAt: refreshTokenExpiresAt(),
		});
		if (!rotated) return rejectRefresh();

		const accessToken = await app.auth.signAccessToken({ userId });
		app.auth.setAuthCookie(reply, accessToken);
		app.auth.setRefreshCookie(reply, nextToken.value);
		return reply.send({ ok: true });
	});

	app.post("/auth/logout", async (request, reply) => {
		assertTrustedOrigin(request.headers.origin);
		const refreshToken = parseRefreshToken(
			request.cookies[REFRESH_TOKEN_COOKIE],
		);
		if (refreshToken) {
			await authSessions.revoke(
				refreshToken.sessionId,
				hashRefreshToken(refreshToken.secret),
			);
		}
		app.auth.clearAuthCookie(reply);
		app.auth.clearRefreshCookie(reply);
		reply.send({ ok: true });
	});

	app.get(
		"/me",
		{ preHandler: app.auth.requireUser },
		async (request, reply) => {
			const userId = request.user.userId;
			if (!userId) return;

			const me = await getMe(userId);

			if (!me) {
				app.auth.clearAuthCookie(reply);
				throw new AppError("UNAUTHORIZED", "ログインが必要です。");
			}

			reply.send(me);
		},
	);

	app.put("/me/name", { preHandler: app.auth.requireUser }, async (request) => {
		const userId = request.user.userId;
		const body = UpdateUserNameRequestSchema.parse(request.body);

		return updateUserName(userId, body.name);
	});

	app.put(
		"/me/password",
		{ preHandler: app.auth.requireUser },
		async (request, reply) => {
			const userId = request.user.userId;
			const body = ChangePasswordRequestSchema.parse(request.body);

			await changePassword(userId, body.currentPassword, body.newPassword);
			await authSessions.revokeAllForUser(userId);
			app.auth.clearAuthCookie(reply);
			app.auth.clearRefreshCookie(reply);
			return { ok: true };
		},
	);

	app.post(
		"/me/password-credential",
		{ preHandler: app.auth.requireUser },
		async (request) => {
			const body = SetPasswordCredentialRequestSchema.parse(request.body);
			return setPasswordCredential(
				request.user.userId,
				body.loginId.toLowerCase(),
				body.password,
			);
		},
	);

	app.get("/auth/discord", async (request, reply) => {
		const query = request.query as { flow?: unknown };
		const flow: DiscordOAuthFlow =
			query.flow === "onboarding"
				? "onboarding"
				: query.flow === "account"
					? "account"
					: "login";
		if (flow !== "login" && !(await app.auth.resolveOptionalUser(request))) {
			throw new AppError("UNAUTHORIZED", "ログインが必要です。");
		}
		const state = randomBytes(32).toString("base64url");
		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax" as const,
			path: "/api/auth/discord",
			maxAge: DISCORD_OAUTH_STATE_MAX_AGE_SECONDS,
		};
		reply.setCookie(DISCORD_OAUTH_STATE_COOKIE, state, cookieOptions);
		reply.setCookie(DISCORD_OAUTH_FLOW_COOKIE, flow, cookieOptions);
		return reply.redirect(getDiscordAuthorizationUrl(state));
	});

	app.get("/auth/discord/callback", async (request, reply) => {
		const frontendUrl = getDiscordOAuthFrontendUrl();
		const query = request.query as {
			code?: unknown;
			state?: unknown;
			error?: unknown;
		};
		const cookieState = request.cookies[DISCORD_OAUTH_STATE_COOKIE];
		const rawFlow = request.cookies[DISCORD_OAUTH_FLOW_COOKIE];
		const flow: DiscordOAuthFlow =
			rawFlow === "onboarding"
				? "onboarding"
				: rawFlow === "account"
					? "account"
					: "login";
		const returnedState =
			typeof query.state === "string" ? query.state : undefined;

		reply.clearCookie(DISCORD_OAUTH_STATE_COOKIE, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/api/auth/discord",
		});
		reply.clearCookie(DISCORD_OAUTH_FLOW_COOKIE, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/api/auth/discord",
		});

		if (!statesMatch(cookieState, returnedState)) {
			return reply.redirect(
				discordOAuthResultUrl(frontendUrl, flow, "invalid_state"),
			);
		}

		if (typeof query.error === "string") {
			return reply.redirect(
				discordOAuthResultUrl(frontendUrl, flow, "cancelled"),
			);
		}
		if (typeof query.code !== "string" || query.code.length === 0) {
			return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "failed"));
		}

		try {
			const discordUser = await getDiscordUserFromCode(query.code);
			const currentUserId = await app.auth.resolveOptionalUser(request);
			if (flow === "login") {
				const repository = new UserRepository();
				let user = await repository.findByDiscordUserId(discordUser.id);
				if (user) {
					user = await repository.save(
						user.connectDiscord(discordUser.username, discordUser.id),
					);
				} else {
					user = await repository.create(
						runBusinessRule(() =>
							User.createWithDiscord({
								name: discordUser.displayName,
								discordUsername: discordUser.username,
								discordUserId: discordUser.id,
							}),
						),
					);
				}
				await repository.updateDiscordProfile(user.id, {
					displayName: discordUser.displayName,
					avatarHash: discordUser.avatarHash,
				});
				await issueSession(user.id, reply);
				return reply.redirect(`${frontendUrl}/dashboard?discord=logged_in`);
			}
			if (!currentUserId) {
				return reply.redirect(
					discordOAuthResultUrl(frontendUrl, flow, "login_required"),
				);
			}
			await connectDiscord(currentUserId, {
				username: discordUser.username,
				userId: discordUser.id,
				displayName: discordUser.displayName,
				avatarHash: discordUser.avatarHash,
			});
			return reply.redirect(
				discordOAuthResultUrl(frontendUrl, flow, "connected"),
			);
		} catch (error) {
			if (error instanceof AppError && error.code === "CONFLICT") {
				return reply.redirect(
					discordOAuthResultUrl(frontendUrl, flow, "conflict"),
				);
			}
			request.log.error({ err: error }, "Discord OAuth callback failed");
			return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "failed"));
		}
	});

	app.delete(
		"/me/discord",
		{ preHandler: app.auth.requireUser },
		async (request) => {
			const userId = request.user.userId;

			return disconnectDiscord(userId);
		},
	);

	app.get(
		"/me/discord-profile",
		{ preHandler: app.auth.requireUser },
		async (request) => getMyDiscordProfile(request.user.userId),
	);
};

function assertTrustedOrigin(origin: string | undefined): void {
	if (!origin) return;
	const trustedOrigins = new Set([
		"http://localhost:5173",
		"https://off.kg-misskey.net",
		process.env.FRONTEND_URL,
	]);
	if (!trustedOrigins.has(origin)) {
		throw new AppError("FORBIDDEN", "許可されていないリクエスト元です。");
	}
}

function rejectRefresh(): never {
	throw new AppError("UNAUTHORIZED", "ログインが必要です。");
}

function toAuthUserResponse(user: User) {
	return {
		id: user.id,
		loginId: user.loginId,
		name: user.name,
		discordUsername: user.discordUsername,
		discordUserId: user.discordUserId,
		createdAt: user.createdAt.toISOString(),
	};
}

function statesMatch(
	cookieState: string | undefined,
	returnedState: string | undefined,
): boolean {
	if (!cookieState || !returnedState) return false;
	const cookieBuffer = Buffer.from(cookieState);
	const returnedBuffer = Buffer.from(returnedState);
	return (
		cookieBuffer.length === returnedBuffer.length &&
		timingSafeEqual(cookieBuffer, returnedBuffer)
	);
}

function discordOAuthResultUrl(
	frontendUrl: string,
	flow: DiscordOAuthFlow,
	result: string,
): string {
	if (flow === "onboarding") {
		const path = result === "connected" ? "/dashboard" : "/onboarding/discord";
		return `${frontendUrl}${path}?discord=${encodeURIComponent(result)}`;
	}
	if (flow === "login")
		return `${frontendUrl}/login?discord=${encodeURIComponent(result)}`;
	return `${frontendUrl}/account?discord=${encodeURIComponent(result)}`;
}
