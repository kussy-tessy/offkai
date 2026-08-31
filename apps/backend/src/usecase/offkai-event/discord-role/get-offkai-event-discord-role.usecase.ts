import type {
	GetOffkaiEventDiscordRoleMembersRequest,
	GetOffkaiEventDiscordRoleResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { discordService } from "../../../discord";
import { OffkaiEventRepository } from "../../../repository";

export async function getOffkaiEventDiscordRole(
	input: GetOffkaiEventDiscordRoleMembersRequest,
	userId: UserId,
): Promise<Unbrand<GetOffkaiEventDiscordRoleResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	await requireEventPermission(event.id, userId, { area: "discordRole", level: "read" });

	const discordGuildId = await repository.findSeriesDiscordGuildId(
		event.seriesId,
	);
	if (!discordGuildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"DiscordギルドIDが設定されていません。",
		);
	}
	const roles = await discordService.listRoles(discordGuildId);
	return {
		discordRoleId: event.discordRoleId,
		roles: roles.map((role) => ({ id: role.id, name: role.name })),
	};
}
