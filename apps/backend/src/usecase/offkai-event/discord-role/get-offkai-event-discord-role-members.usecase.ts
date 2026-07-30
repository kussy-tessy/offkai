import type {
	GetOffkaiEventDiscordRoleMembersRequest,
	GetOffkaiEventDiscordRoleMembersResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import { discordService } from "../../../discord";
import { OffkaiEventRepository } from "../../../repository";

export async function getOffkaiEventDiscordRoleMembers(
	input: GetOffkaiEventDiscordRoleMembersRequest,
	ownerUserId: UserId,
): Promise<Unbrand<GetOffkaiEventDiscordRoleMembersResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	const seriesRole = await repository.findSeriesMemberRole(ownerUserId, event.seriesId);

	if (!hasSeriesRole(seriesRole, "staff")) {
		throw new AppError("FORBIDDEN", "このオフ会のDiscordロールを管理する権限がありません。");
	}

	if (!event.discordRoleId) {
		throw new AppError("VALIDATION_ERROR", "Discordロールが設定されていません。");
	}

	const discordGuildId = await repository.findSeriesDiscordGuildId(event.seriesId);
	if (!discordGuildId) {
		throw new AppError("VALIDATION_ERROR", "DiscordギルドIDが設定されていません。");
	}

	const roles = await discordService.listRoles(discordGuildId);
	const role = roles.find((role) => role.id === event.discordRoleId);
	if (!role) {
		throw new AppError("VALIDATION_ERROR", "Discordロールが見つかりません。");
	}

	const respondents = await repository.findRespondentUsersByEventId(event.id);
	const discordUserIds = [
		...new Set(
			respondents.flatMap((respondent) =>
				respondent.discordUserId ? [respondent.discordUserId] : [],
			),
		),
	];
	const memberRoleProfiles = await discordService.getMemberRoleProfilesByUserIds({
		guildId: discordGuildId,
		roleId: event.discordRoleId,
		userIds: discordUserIds,
	});
	const members: Unbrand<GetOffkaiEventDiscordRoleMembersResponse>["members"] = [];

	for (const respondent of respondents) {
		if (!respondent.discordUserId) {
			members.push({
				userId: respondent.userId,
				displayName: respondent.displayName,
				discordUsername: respondent.discordUsername,
				discordUserId: null,
				discordAvatarUrl: null,
				hasRole: false,
				canManageRole: false,
				unavailableReason: "DISCORD_NOT_CONNECTED",
			});
			continue;
		}

		const memberRoleProfile = memberRoleProfiles.get(respondent.discordUserId);
		if (memberRoleProfile === undefined) {
			members.push({
				userId: respondent.userId,
				displayName: respondent.displayName,
				discordUsername: respondent.discordUsername,
				discordUserId: respondent.discordUserId,
				discordAvatarUrl: null,
				hasRole: false,
				canManageRole: false,
				unavailableReason: "DISCORD_MEMBER_NOT_FOUND",
			});
			continue;
		}

		members.push({
			userId: respondent.userId,
			displayName: respondent.displayName,
			discordUsername: respondent.discordUsername,
			discordUserId: respondent.discordUserId,
			discordAvatarUrl: memberRoleProfile.avatarUrl,
			hasRole: memberRoleProfile.hasRole,
			canManageRole: true,
		});
	}

	return {
		role: {
			id: role.id,
			name: role.name,
		},
		members,
	};
}
