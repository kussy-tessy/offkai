import { randomBytes, timingSafeEqual } from "node:crypto";
import {
	ChangePasswordRequestSchema,
	UpdateUserNameRequestSchema,
	User,
	UserLoginIdSchema,
} from "@offkai/core";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { AppError, runBusinessRule } from "../app-error";
import { UserRepository } from "../repository";
import {
	changePassword,
	connectDiscord,
	disconnectDiscord,
	getMyDiscordProfile,
	getMe,
	updateUserName,
} from "../usecase";
import {
	getDiscordAuthorizationUrl,
	getDiscordOAuthFrontendUrl,
	getDiscordUserFromCode,
} from "./discord-oauth";

const DISCORD_OAUTH_STATE_COOKIE = "offkai_discord_oauth_state";
const DISCORD_OAUTH_FLOW_COOKIE = "offkai_discord_oauth_flow";
const DISCORD_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
type DiscordOAuthFlow = "account" | "onboarding";

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
				User.create({
					loginId: normalizedLoginId,
					name,
					passwordHash,
					discordUsername: null,
					discordUserId: null,
				}),
			),
		);

		const token = await app.auth.signAccessToken({ userId: user.id });
		app.auth.setAuthCookie(reply, token);

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

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) {
			throw new AppError(
				"INVALID_CREDENTIALS",
				"ログインIDまたはパスワードが正しくありません。",
			);
		}

		const token = await app.auth.signAccessToken({ userId: user.id });
		app.auth.setAuthCookie(reply, token);

		reply.send({ ok: true, user: toAuthUserResponse(user) });
	});

	app.post("/auth/logout", async (_request, reply) => {
		app.auth.clearAuthCookie(reply);
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
		async (request) => {
			const userId = request.user.userId;
			const body = ChangePasswordRequestSchema.parse(request.body);

			await changePassword(userId, body.currentPassword, body.newPassword);
			return { ok: true };
		},
	);

	app.get(
		"/auth/discord",
		{ preHandler: app.auth.requireUser },
		async (request, reply) => {
			const query = request.query as { flow?: unknown };
			const flow: DiscordOAuthFlow =
				query.flow === "onboarding" ? "onboarding" : "account";
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
		},
	);

	app.get(
		"/auth/discord/callback",
		{ preHandler: app.auth.requireUser },
		async (request, reply) => {
			const frontendUrl = getDiscordOAuthFrontendUrl();
			const query = request.query as {
				code?: unknown;
				state?: unknown;
				error?: unknown;
			};
			const cookieState = request.cookies[DISCORD_OAUTH_STATE_COOKIE];
			const flow: DiscordOAuthFlow =
				request.cookies[DISCORD_OAUTH_FLOW_COOKIE] === "onboarding"
					? "onboarding"
					: "account";
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
				return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "invalid_state"));
			}

			if (typeof query.error === "string") {
				return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "cancelled"));
			}
			if (typeof query.code !== "string" || query.code.length === 0) {
				return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "failed"));
			}

			try {
				const discordUser = await getDiscordUserFromCode(query.code);
				await connectDiscord(
					request.user.userId,
					discordUser.username,
					discordUser.id,
				);
				return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "connected"));
			} catch (error) {
				if (error instanceof AppError && error.code === "CONFLICT") {
					return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "conflict"));
				}
				request.log.error({ err: error }, "Discord OAuth callback failed");
				return reply.redirect(discordOAuthResultUrl(frontendUrl, flow, "failed"));
			}
		},
	);

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
	return `${frontendUrl}/account?discord=${encodeURIComponent(result)}`;
}
