import type {
	GetDiscordChannelConfigurationRequest,
	GetDiscordChannelConfigurationResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { discordService } from "../../../discord";
import { OffkaiEventRepository } from "../../../repository";

export async function getDiscordChannelConfiguration(
	input: GetDiscordChannelConfigurationRequest,
	userId: UserId,
): Promise<Unbrand<GetDiscordChannelConfigurationResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	await requireEventPermission(event.id, userId, {
		area: "discordRole",
		level: "read",
	});
	const guildId = await repository.findSeriesDiscordGuildId(event.seriesId);
	if (!guildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"DiscordギルドIDが設定されていません。",
		);
	}
	return {
		suggestedCategoryName: event.name,
		suggestedRoleName: `${event.name}参加者`,
		categories: await discordService.listCategories(guildId),
	};
}
