import {
	ChangePasswordRequestSchema,
	ConnectDiscordRequestSchema,
	DiscordUsernameSchema,
	User,
	UserLoginIdSchema,
	UpdateUserNameRequestSchema,
} from "@offkai/core";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { AppError, runBusinessRule } from "../app-error";
import { discordService } from "../discord";
import { OffkaiEventRepository, UserRepository } from "../repository";
import {
	changePassword,
	connectDiscord,
	disconnectDiscord,
	getMe,
	updateUserName,
} from "../usecase";

type RegisterBody = {
	loginId: string;
	password: string;
	name: string;
	discordUsername?: string | null;
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
		const discordUsernameInput = (body.discordUsername ?? "").trim().toLowerCase();
		const discordUsername = discordUsernameInput || null;
		const loginIdValidation = UserLoginIdSchema.safeParse(loginId);
		const discordUsernameValidation = discordUsername
			? DiscordUsernameSchema.safeParse(discordUsername)
			: null;

		if (
			!loginIdValidation.success ||
			!password ||
			!name ||
			(discordUsernameValidation && !discordUsernameValidation.success)
		) {
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

		const discordUserId = discordUsername
			? await resolveDiscordUserId(discordUsername)
			: null;

		if (discordUsername && !discordUserId) {
			throw new AppError("VALIDATION_ERROR", "Discordメンバーが見つかりません。");
		}

		if (discordUsername) {
			const [linkedUserByUsername, linkedUserByUserId] = await Promise.all([
				repository.findByDiscordUsername(discordUsername),
				discordUserId ? repository.findByDiscordUserId(discordUserId) : null,
			]);
			if (linkedUserByUsername || linkedUserByUserId) {
				throw new AppError(
					"CONFLICT",
					"このDiscordアカウントはすでに連携されています。",
				);
			}
		}

		const passwordHash = await bcrypt.hash(password, 12);
		const user = await repository.create(
			runBusinessRule(() =>
				User.create({
					loginId: normalizedLoginId,
					name,
					passwordHash,
					discordUsername,
					discordUserId,
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

	app.get("/me", { preHandler: app.auth.requireUser }, async (request, reply) => {
		const userId = request.user.userId;
		if (!userId) return;

		const me = await getMe(userId);

		if (!me) {
			app.auth.clearAuthCookie(reply);
			throw new AppError("UNAUTHORIZED", "ログインが必要です。");
		}

		reply.send(me);
	});

	app.put(
		"/me/name",
		{ preHandler: app.auth.requireUser },
		async (request) => {
			const userId = request.user.userId;
			const body = UpdateUserNameRequestSchema.parse(request.body);

			return updateUserName(userId, body.name);
		},
	);

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

	app.put(
		"/me/discord",
		{ preHandler: app.auth.requireUser },
		async (request) => {
			const userId = request.user.userId;
			const body = ConnectDiscordRequestSchema.parse(request.body);

			return connectDiscord(userId, body.discordUsername);
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

async function resolveDiscordUserId(discordUsername: string): Promise<string | null> {
	const guildIds = await new OffkaiEventRepository().findAllSeriesDiscordGuildIds();
	if (guildIds.length === 0) {
		throw new AppError("VALIDATION_ERROR", "DiscordギルドIDが設定されていません。");
	}

	for (const guildId of guildIds) {
		const discordUserId = await discordService.getUserIdByUsername({
			guildId,
			username: discordUsername,
		});
		if (discordUserId) return discordUserId;
	}

	return null;
}
