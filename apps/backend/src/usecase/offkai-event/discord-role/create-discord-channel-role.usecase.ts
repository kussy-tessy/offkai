import type {
	CreateDiscordChannelRoleRequest,
	CreateDiscordChannelRoleResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { discordService } from "../../../discord";
import { OffkaiEventRepository } from "../../../repository";

export async function createDiscordChannelRole(
	input: CreateDiscordChannelRoleRequest,
	userId: UserId,
): Promise<Unbrand<CreateDiscordChannelRoleResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	await requireEventPermission(event.id, userId, {
		area: "discordRole",
		level: "manage",
	});
	const guildId = await repository.findSeriesDiscordGuildId(event.seriesId);
	if (!guildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"DiscordギルドIDが設定されていません。",
		);
	}
	return discordService.createChannelRoleConfiguration({
		guildId,
		category: input.category,
		role: input.role,
		reason: `KigPla event setup: ${event.name}`,
	});
}
