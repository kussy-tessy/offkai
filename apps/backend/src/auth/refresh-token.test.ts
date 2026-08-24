import { describe, expect, it } from "vitest";
import {
	createRefreshToken,
	hashRefreshToken,
	parseRefreshToken,
	refreshTokenExpiresAt,
} from "./refresh-token";

describe("refresh token", () => {
	it("creates a parseable opaque token without storing the secret as its hash", () => {
		const token = createRefreshToken();
		expect(parseRefreshToken(token.value)).toEqual(token);
		expect(hashRefreshToken(token.secret)).toMatch(/^[0-9a-f]{64}$/);
		expect(hashRefreshToken(token.secret)).not.toBe(token.secret);
	});

	it("rejects malformed tokens", () => {
		expect(parseRefreshToken(undefined)).toBeNull();
		expect(parseRefreshToken("invalid")).toBeNull();
		expect(
			parseRefreshToken("00000000-0000-0000-0000-000000000000.short"),
		).toBeNull();
	});

	it("expires one year after its latest use", () => {
		const now = new Date("2026-08-19T00:00:00.000Z");
		expect(refreshTokenExpiresAt(now).toISOString()).toBe(
			"2027-08-19T00:00:00.000Z",
		);
	});
});
