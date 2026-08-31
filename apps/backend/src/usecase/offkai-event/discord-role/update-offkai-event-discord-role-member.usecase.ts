import type {
	Unbrand,
	UpdateOffkaiEventDiscordRoleMemberRequest,
	UpdateOffkaiEventDiscordRoleMemberResponse,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { discordService } from "../../../discord";
import { OffkaiEventRepository } from "../../../repository";

export async function updateOffkaiEventDiscordRoleMember(
	input: UpdateOffkaiEventDiscordRoleMemberRequest,
	ownerUserId: UserId,
): Promise<Unbrand<UpdateOffkaiEventDiscordRoleMemberResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	await requireEventPermission(event.id, ownerUserId, { area: "discordRole", level: "assign" });

	if (!event.discordRoleId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordロールが設定されていません。",
		);
	}

	const discordGuildId = await repository.findSeriesDiscordGuildId(
		event.seriesId,
	);
	if (!discordGuildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"DiscordギルドIDが設定されていません。",
		);
	}

	const respondent = await repository.findRespondentUserByEventAndUser(
		event.id,
		input.userId,
	);
	if (!respondent) {
		throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
	}

	if (!respondent.discordUserId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"DiscordユーザーIDが登録されていません。",
		);
	}

	if (input.hasRole) {
		await discordService.addRoleToMember({
			guildId: discordGuildId,
			roleId: event.discordRoleId,
			userId: respondent.discordUserId,
			reason: "Offkai event role assignment",
		});
	} else {
		await discordService.removeRoleFromMember({
			guildId: discordGuildId,
			roleId: event.discordRoleId,
			userId: respondent.discordUserId,
			reason: "Offkai event role removal",
		});
	}

	return {
		userId: respondent.userId,
		hasRole: input.hasRole,
	};
}
