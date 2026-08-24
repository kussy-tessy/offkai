import type { ListDiscordRolesResponse, Unbrand, UserId } from "@offkai/core";
import { AppError } from "../../app-error";
import { discordService } from "../../discord";
import { OffkaiEventRepository } from "../../repository";

export async function listDiscordRoles(
	userId: UserId,
): Promise<Unbrand<ListDiscordRolesResponse>> {
	const repository = new OffkaiEventRepository();
	const discordGuildId = await repository.findOwnerSeriesDiscordGuildId(userId);
	if (!discordGuildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"DiscordギルドIDが設定されていません。",
		);
	}

	const roles = await discordService.listRoles(discordGuildId);

	return {
		roles: roles.map((role) => ({
			id: role.id,
			name: role.name,
		})),
	};
}
