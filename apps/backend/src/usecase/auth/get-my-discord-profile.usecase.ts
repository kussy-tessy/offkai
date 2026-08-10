import type {
	GetMyDiscordProfileResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../app-error";
import { discordService } from "../../discord";
import { UserRepository } from "../../repository";

export async function getMyDiscordProfile(
	userId: UserId,
): Promise<Unbrand<GetMyDiscordProfileResponse>> {
	const user = await new UserRepository().findById(userId);
	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}
	if (!user.discordUserId || !user.discordUsername) {
		throw new AppError("VALIDATION_ERROR", "Discordアカウントが未連携です。");
	}

	const profile = await discordService.getUserProfile(user.discordUserId);
	return {
		username: profile?.username ?? user.discordUsername,
		avatarUrl: profile?.avatarUrl ?? null,
	};
}
