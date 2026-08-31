import { LegacyStaffPermissions } from "@offkai/core";
import { describe, expect, it } from "vitest";
import { hasStaffPermission } from "./staff-permissions";

describe("Staff権限の段階", () => {
	it("上位権限は下位操作を含む", () => {
		expect(hasStaffPermission(LegacyStaffPermissions, { area: "feeCalculation", level: "read" })).toBe(true);
		expect(hasStaffPermission(LegacyStaffPermissions, { area: "feeCalculation", level: "confirm" })).toBe(true);
		expect(hasStaffPermission(LegacyStaffPermissions, { area: "discordRole", level: "assign" })).toBe(true);
	});

	it("権限なしと閲覧権限では更新操作を許可しない", () => {
		const permissions = { ...LegacyStaffPermissions, discordRole: "read" as const, settlement: "none" as const };
		expect(hasStaffPermission(permissions, { area: "discordRole", level: "read" })).toBe(true);
		expect(hasStaffPermission(permissions, { area: "discordRole", level: "assign" })).toBe(false);
		expect(hasStaffPermission(permissions, { area: "settlement", level: "read" })).toBe(false);
	});

	it("オフ会編集は独立したbooleanで判定する", () => {
		expect(hasStaffPermission(LegacyStaffPermissions, { area: "eventManagement" })).toBe(false);
		expect(hasStaffPermission({ ...LegacyStaffPermissions, eventManagement: true }, { area: "eventManagement" })).toBe(true);
	});
});
