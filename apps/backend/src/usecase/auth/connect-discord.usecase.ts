import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import { AppError, runBusinessRule } from "../../app-error";
import { discordService } from "../../discord";
import { OffkaiEventRepository, UserRepository } from "../../repository";
import { getMe } from "./get-me.usecase";

export async function connectDiscord(
	userId: UserId,
	discordUsername: string,
): Promise<Unbrand<GetMeResponse>> {
	const repository = new UserRepository();
	const eventRepository = new OffkaiEventRepository();
	const discordUserId = await resolveDiscordUserId(discordUsername, eventRepository);
	if (!discordUserId) {
		throw new AppError("VALIDATION_ERROR", "Discordメンバーが見つかりません。");
	}

	const [user, linkedUserByUsername, linkedUserByUserId] = await Promise.all([
		repository.findById(userId),
		repository.findByDiscordUsername(discordUsername),
		repository.findByDiscordUserId(discordUserId),
	]);

	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	const linkedUser = linkedUserByUserId ?? linkedUserByUsername;
	if (linkedUser && linkedUser.id !== user.id) {
		throw new AppError(
			"CONFLICT",
			"このDiscordアカウントはすでに連携されています。",
		);
	}

	await repository.save(
		runBusinessRule(() => user.connectDiscord(discordUsername, discordUserId)),
	);

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

async function resolveDiscordUserId(
	discordUsername: string,
	repository: OffkaiEventRepository,
): Promise<string | null> {
	const guildIds = await repository.findAllSeriesDiscordGuildIds();
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
