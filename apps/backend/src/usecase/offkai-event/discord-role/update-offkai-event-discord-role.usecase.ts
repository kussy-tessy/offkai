import type {
	Unbrand,
	UpdateOffkaiEventDiscordRoleRequest,
	UpdateOffkaiEventDiscordRoleResponse,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import { discordService } from "../../../discord";
import { OffkaiEventRepository } from "../../../repository";

export async function updateOffkaiEventDiscordRole(
	input: UpdateOffkaiEventDiscordRoleRequest,
	userId: UserId,
): Promise<Unbrand<UpdateOffkaiEventDiscordRoleResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	const seriesRole = await repository.findSeriesMemberRole(
		userId,
		event.seriesId,
	);

	if (!hasSeriesRole(seriesRole, "staff")) {
		throw new AppError(
			"FORBIDDEN",
			"このオフ会のDiscordロールを設定する権限がありません。",
		);
	}

	if (input.discordRoleId) {
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
		if (!roles.some((role) => role.id === input.discordRoleId)) {
			throw new AppError("VALIDATION_ERROR", "Discordロールが見つかりません。");
		}
	}

	await repository.updateDiscordRoleId(event.id, input.discordRoleId);
	return { discordRoleId: input.discordRoleId };
}
