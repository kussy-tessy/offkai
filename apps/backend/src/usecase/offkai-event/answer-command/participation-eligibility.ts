import type { OffkaiEvent, UserId } from "@offkai/core";
import { AppError } from "../../../app-error";
import { discordService } from "../../../discord";
import { OffkaiEventRepository, UserRepository } from "../../../repository";

export async function requireParticipationEligibility(
	event: OffkaiEvent,
	userId: UserId,
): Promise<void> {
	if (event.participationEligibility === "AUTHENTICATED") return;

	const user = await new UserRepository().findById(userId);
	if (!user?.discordUserId) {
		throw new AppError(
			"EVENT_ACCESS_DENIED",
			"参加表明するにはDiscordアカウントの連携が必要です。",
		);
	}
	const guildId = await new OffkaiEventRepository().findSeriesDiscordGuildId(
		event.seriesId,
	);
	if (!guildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"シリーズのDiscordサーバーが設定されていません。",
		);
	}

	try {
		if (await discordService.isGuildMember({ guildId, userId: user.discordUserId })) {
			return;
		}
	} catch {
		throw new AppError(
			"DISCORD_MEMBERSHIP_CHECK_FAILED",
			"Discordサーバーへの所属を確認できません。しばらくしてから再試行してください。",
		);
	}
	throw new AppError(
		"EVENT_ACCESS_DENIED",
		"このオフ会はDiscordサーバー参加者のみ参加表明できます。",
	);
}
