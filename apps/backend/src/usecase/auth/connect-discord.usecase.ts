import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import { AppError, runBusinessRule } from "../../app-error";
import { UserRepository } from "../../repository";
import { getMe } from "./get-me.usecase";

export async function connectDiscord(
	userId: UserId,
	discordProfile: {
		username: string;
		userId: string;
		displayName: string;
		avatarHash: string | null;
	},
): Promise<Unbrand<GetMeResponse>> {
	const repository = new UserRepository();

	const [user, linkedUserByUserId] = await Promise.all([
		repository.findById(userId),
		repository.findByDiscordUserId(discordProfile.userId),
	]);

	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	if (
		linkedUserByUserId?.id !== undefined &&
		linkedUserByUserId.id !== user.id
	) {
		throw new AppError(
			"CONFLICT",
			"このDiscordアカウントはすでに連携されています。",
		);
	}

	await repository.save(
		runBusinessRule(() =>
			user.connectDiscord(discordProfile.username, discordProfile.userId),
		),
	);
	await repository.updateDiscordProfile(user.id, {
		displayName: discordProfile.displayName,
		avatarHash: discordProfile.avatarHash,
	});

	const me = await getMe(userId);
	if (!me) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	return me;
}

export async function disconnectDiscord(
	userId: UserId,
): Promise<Unbrand<GetMeResponse>> {
	const repository = new UserRepository();
	const user = await repository.findById(userId);

	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}
	if (!user.passwordHash) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discord連携を解除する前にログインIDとパスワードを設定してください。",
		);
	}

	await repository.save(user.disconnectDiscord());

	const me = await getMe(userId);
	if (!me) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	return me;
}
