import { describe, expect, it } from "vitest";
import { safeLoginRedirect } from "./login-redirect";

describe("safeLoginRedirect", () => {
	it("preserves the requested page, query and fragment", () => {
		const path = "/offkai/event-123?tab=answers&name=%E3%81%82#answer";
		expect(safeLoginRedirect(path)).toBe(path);
	});

	it.each([
		"/\ud800",
		undefined,
		null,
		["/offkai"],
		"",
		"https://example.com",
		"//example.com",
		"/\\example.com",
		"/\n/example.com",
		"/\t/example.com",
		"/path\r\nLocation:evil",
		`/${"a".repeat(3000)}`,
	])("rejects unsafe or invalid destinations: %j", (value) => {
		expect(safeLoginRedirect(value)).toBeUndefined();
	});
});
