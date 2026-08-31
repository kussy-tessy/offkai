import { LegacyStaffPermissions } from "@offkai/core";
import { describe, expect, it } from "vitest";
import {
	createEventViewerPermissions,
	evaluateEventVisibility,
	evaluateParticipationEligibility,
	hasSeriesRole,
} from "./event-access";

const anonymousViewer = {
	isAuthenticated: false,
	seriesRole: null,
	isParticipant: false,
	discordMembership: "NOT_CHECKED" as const,
};

describe("シリーズ権限", () => {
	it("ownerはstaff権限を含む", () => {
		expect(hasSeriesRole("owner", "staff")).toBe(true);
		expect(hasSeriesRole("staff", "owner")).toBe(false);
		expect(hasSeriesRole(null, "staff")).toBe(false);
	});

	it("ownerは常に全操作でき、回答済みstaffにはシリーズ設定を適用する", () => {
		const access = { granted: true } as const;
		const owner = createEventViewerPermissions({
			seriesRole: "owner",
			isParticipant: false,
			overviewAccess: access,
			participantsAccess: access,
		});
		const staff = createEventViewerPermissions({
			seriesRole: "staff",
			isParticipant: true,
			overviewAccess: access,
			participantsAccess: access,
			staffPermissions: LegacyStaffPermissions,
		});
		expect(owner).toMatchObject({
			canEditEvent: true,
			canDeleteEvent: true,
			canEditAnswers: true,
			canManageDiscordRole: true,
			canManagePayments: true,
		});
		expect(staff).toMatchObject({
			canEditEvent: false,
			canDeleteEvent: false,
			canEditAnswers: false,
			canManageDiscordRole: true,
			canManagePayments: true,
			canViewParticipantGuide: true,
		});
	});

	it("参加者向け案内は参加表明者とownerだけが閲覧できる", () => {
		const access = { granted: true } as const;
		const permissions = (seriesRole: "staff" | null, isParticipant: boolean) =>
			createEventViewerPermissions({
				seriesRole,
				isParticipant,
				overviewAccess: access,
				participantsAccess: access,
			});

		expect(permissions(null, false).canViewParticipantGuide).toBe(false);
		expect(permissions(null, true).canViewParticipantGuide).toBe(true);
		expect(permissions("staff", false).canViewParticipantGuide).toBe(false);
	});
});

describe("参加表明できる人", () => {
	it("ログインユーザー設定では認証済みユーザーを許可する", () => {
		expect(
			evaluateParticipationEligibility("AUTHENTICATED", {
				...anonymousViewer,
				isAuthenticated: true,
			}),
		).toEqual({ granted: true });
	});

	it("Discord限定では所属者だけを許可する", () => {
		const viewer = { ...anonymousViewer, isAuthenticated: true };
		expect(
			evaluateParticipationEligibility("GUILD_MEMBERS", {
				...viewer,
				discordMembership: "MEMBER",
			}),
		).toEqual({ granted: true });
		expect(
			evaluateParticipationEligibility("GUILD_MEMBERS", {
				...viewer,
				discordMembership: "NOT_MEMBER",
			}),
		).toEqual({ granted: false, reason: "NOT_GUILD_MEMBER" });
	});

	it("既存参加者とownerはDiscord所属を失っても編集できる", () => {
		const deniedViewer = {
			...anonymousViewer,
			isAuthenticated: true,
			discordMembership: "NOT_MEMBER" as const,
		};
		expect(
			evaluateParticipationEligibility("GUILD_MEMBERS", {
				...deniedViewer,
				isParticipant: true,
			}),
		).toEqual({ granted: true });
		expect(
			evaluateParticipationEligibility("GUILD_MEMBERS", {
				...deniedViewer,
				seriesRole: "owner",
			}),
		).toEqual({ granted: true });
	});
});

describe("イベント公開範囲", () => {
	it("未ログインユーザーには認証限定と参加者限定を公開しない", () => {
		expect(evaluateEventVisibility("AUTHENTICATED", anonymousViewer)).toEqual({
			granted: false,
			reason: "AUTHENTICATION_REQUIRED",
		});
		expect(evaluateEventVisibility("PARTICIPANTS", anonymousViewer)).toEqual({
			granted: false,
			reason: "AUTHENTICATION_REQUIRED",
		});
	});

	it("参加者限定は認証済みであっても非参加者には公開しない", () => {
		expect(
			evaluateEventVisibility("PARTICIPANTS", {
				...anonymousViewer,
				isAuthenticated: true,
			}),
		).toEqual({ granted: false, reason: "NOT_PARTICIPANT" });
	});

	it("Discord限定では未連携と所属確認障害を区別する", () => {
		const authenticated = { ...anonymousViewer, isAuthenticated: true };
		expect(
			evaluateEventVisibility("GUILD_MEMBERS", {
				...authenticated,
				discordMembership: "NOT_CONNECTED",
			}),
		).toEqual({ granted: false, reason: "DISCORD_NOT_CONNECTED" });
		expect(
			evaluateEventVisibility("GUILD_MEMBERS", {
				...authenticated,
				discordMembership: "UNAVAILABLE",
			}),
		).toEqual({ granted: false, reason: "MEMBERSHIP_CHECK_UNAVAILABLE" });
	});

	it("回答済みstaffは公開範囲にかかわらず閲覧できる", () => {
		expect(
			evaluateEventVisibility("PARTICIPANTS", {
				...anonymousViewer,
				seriesRole: "staff",
				isParticipant: true,
			}),
		).toEqual({ granted: true });
	});
});
