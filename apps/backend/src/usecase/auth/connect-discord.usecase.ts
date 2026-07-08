import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import { AppError, runBusinessRule } from "../../app-error";
import { UserRepository } from "../../repository";
import { getMe } from "./get-me.usecase";

export async function connectDiscord(
	userId: UserId,
	discordUsername: string,
): Promise<Unbrand<GetMeResponse>> {
	const repository = new UserRepository();
	const [user, linkedUser] = await Promise.all([
		repository.findById(userId),
		repository.findByDiscordUsername(discordUsername),
	]);

	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	if (linkedUser && linkedUser.id !== user.id) {
		throw new AppError(
			"CONFLICT",
			"このDiscordアカウントはすでに連携されています。",
		);
	}

	await repository.save(runBusinessRule(() => user.connectDiscord(discordUsername)));

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

	await repository.save(user.disconnectDiscord());

	const me = await getMe(userId);
	if (!me) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	return me;
}
