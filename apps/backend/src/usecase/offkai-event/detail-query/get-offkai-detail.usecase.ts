import type {
	GetOffkaiDetailRequest,
	GetOffkaiDetailResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import {
	createEventViewerPermissions,
	evaluateEventVisibility,
	hasSeriesRole,
	type DiscordMembershipStatus,
} from "../../../authorization/event-access";
import { discordService } from "../../../discord";
import {
	OffkaiAnswerRepository,
	OffkaiEventRepository,
	UserRepository,
} from "../../../repository";

export async function getOffkaiDetail(
	input: GetOffkaiDetailRequest,
	userId: UserId | null,
): Promise<Unbrand<GetOffkaiDetailResponse>> {
	const eventRepository = new OffkaiEventRepository();
	const event = await eventRepository.findById(input.eventId);
	const [seriesRole, isParticipant, user] = userId
		? await Promise.all([
			eventRepository.findSeriesMemberRole(userId, event.seriesId),
			eventRepository.isParticipant(event.id, userId),
			new UserRepository().findById(userId),
		])
		: [null, false, null];

	let discordMembership: DiscordMembershipStatus = "NOT_CHECKED";
	const needsDiscordMembership =
		!hasSeriesRole(seriesRole, "staff") &&
		(event.overviewVisibility === "GUILD_MEMBERS" ||
			event.participantsVisibility === "GUILD_MEMBERS");

	if (needsDiscordMembership) {
		if (!user?.discordUserId) {
			discordMembership = "NOT_CONNECTED";
		} else {
			const guildId = await eventRepository.findSeriesDiscordGuildId(
				event.seriesId,
			);
			if (!guildId) {
				discordMembership = "NOT_MEMBER";
			} else {
				try {
					discordMembership = (await discordService.isGuildMember({
						guildId,
						userId: user.discordUserId,
					}))
						? "MEMBER"
						: "NOT_MEMBER";
				} catch {
					discordMembership = "UNAVAILABLE";
				}
			}
		}
	}

	const accessViewer = {
		isAuthenticated: userId !== null,
		seriesRole,
		isParticipant,
		discordMembership,
	};
	const overviewAccess = evaluateEventVisibility(
		event.overviewVisibility,
		accessViewer,
	);
	if (!overviewAccess.granted) {
		if (overviewAccess.reason === "AUTHENTICATION_REQUIRED") {
			throw new AppError("AUTHENTICATION_REQUIRED", "ログインが必要です。");
		}
		if (overviewAccess.reason === "MEMBERSHIP_CHECK_UNAVAILABLE") {
			throw new AppError(
				"DISCORD_MEMBERSHIP_CHECK_FAILED",
				"Discordサーバーへの所属を一時的に確認できません。",
			);
		}
		throw new AppError(
			"EVENT_ACCESS_DENIED",
			"このオフ会を閲覧する権限がありません。",
		);
	}

	const participantsAccess = evaluateEventVisibility(
		event.participantsVisibility,
		accessViewer,
	);
	const viewer = {
		seriesRole,
		isParticipant,
		permissions: createEventViewerPermissions({
			seriesRole,
			isParticipant,
			overviewAccess,
			participantsAccess,
		}),
	};

	return new OffkaiAnswerRepository().getOffkaiDetail(
		input.eventId,
		viewer,
		participantsAccess,
	);
}
