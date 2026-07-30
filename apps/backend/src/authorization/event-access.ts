import type { EventVisibility, SeriesRole } from "@offkai/core";

export type DiscordMembershipStatus =
	| "NOT_CHECKED"
	| "NOT_CONNECTED"
	| "MEMBER"
	| "NOT_MEMBER"
	| "UNAVAILABLE";

export type EventAccessDeniedReason =
	| "AUTHENTICATION_REQUIRED"
	| "DISCORD_NOT_CONNECTED"
	| "NOT_GUILD_MEMBER"
	| "NOT_PARTICIPANT"
	| "MEMBERSHIP_CHECK_UNAVAILABLE";

export type EventAccessDecision =
	| { granted: true }
	| { granted: false; reason: EventAccessDeniedReason };

const roleLevels: Record<SeriesRole, number> = {
	staff: 1,
	owner: 2,
};

export function hasSeriesRole(
	actualRole: SeriesRole | null,
	requiredRole: SeriesRole,
): boolean {
	return actualRole !== null && roleLevels[actualRole] >= roleLevels[requiredRole];
}

export function evaluateEventVisibility(
	visibility: EventVisibility,
	viewer: {
		isAuthenticated: boolean;
		seriesRole: SeriesRole | null;
		isParticipant: boolean;
		discordMembership: DiscordMembershipStatus;
	},
): EventAccessDecision {
	if (hasSeriesRole(viewer.seriesRole, "staff")) return { granted: true };

	switch (visibility) {
		case "PUBLIC":
			return { granted: true };
		case "AUTHENTICATED":
			return viewer.isAuthenticated
				? { granted: true }
				: { granted: false, reason: "AUTHENTICATION_REQUIRED" };
		case "PARTICIPANTS":
			if (!viewer.isAuthenticated) {
				return { granted: false, reason: "AUTHENTICATION_REQUIRED" };
			}
			return viewer.isParticipant
				? { granted: true }
				: { granted: false, reason: "NOT_PARTICIPANT" };
		case "GUILD_MEMBERS":
			if (!viewer.isAuthenticated) {
				return { granted: false, reason: "AUTHENTICATION_REQUIRED" };
			}
			if (viewer.discordMembership === "NOT_CONNECTED") {
				return { granted: false, reason: "DISCORD_NOT_CONNECTED" };
			}
			if (viewer.discordMembership === "UNAVAILABLE") {
				return { granted: false, reason: "MEMBERSHIP_CHECK_UNAVAILABLE" };
			}
			return viewer.discordMembership === "MEMBER"
				? { granted: true }
				: { granted: false, reason: "NOT_GUILD_MEMBER" };
	}
}

export function createEventViewerPermissions(input: {
	seriesRole: SeriesRole | null;
	isParticipant: boolean;
	overviewAccess: EventAccessDecision;
	participantsAccess: EventAccessDecision;
}) {
	return {
		canViewOverview: input.overviewAccess.granted,
		canViewParticipants: input.participantsAccess.granted,
		canViewPrivateAnswers: input.isParticipant,
		canEditEvent: hasSeriesRole(input.seriesRole, "owner"),
		canDeleteEvent: hasSeriesRole(input.seriesRole, "owner"),
		canEditAnswers: hasSeriesRole(input.seriesRole, "owner"),
		canManageDiscordRole: hasSeriesRole(input.seriesRole, "staff"),
		canManagePayments: hasSeriesRole(input.seriesRole, "staff"),
	};
}
