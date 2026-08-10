import { describe, expect, it } from "vitest";
import {
	createEventViewerPermissions,
	evaluateEventVisibility,
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

	it("ownerだけがイベントと回答を編集でき、staffも運営機能を利用できる", () => {
		const access = { granted: true } as const;
		const owner = createEventViewerPermissions({
			seriesRole: "owner",
			isParticipant: false,
			overviewAccess: access,
			participantsAccess: access,
		});
		const staff = createEventViewerPermissions({
			seriesRole: "staff",
			isParticipant: false,
			overviewAccess: access,
			participantsAccess: access,
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
		});
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

	it("staff以上は公開範囲にかかわらず閲覧できる", () => {
		expect(
			evaluateEventVisibility("PARTICIPANTS", {
				...anonymousViewer,
				seriesRole: "staff",
			}),
		).toEqual({ granted: true });
	});
});
