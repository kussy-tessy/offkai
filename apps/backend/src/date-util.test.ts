import {
	format,
	formatForForm,
	formatWithDay,
	formatWithSeconds,
} from "@offkai/core";
import { describe, expect, it } from "vitest";

describe("JST date formatting", () => {
	it("formats an instant in JST across a date boundary", () => {
		expect(format(new Date("2026-08-22T15:00:00.000Z"))).toBe(
			"2026/08/23 00:00",
		);
		expect(formatWithSeconds("2026-08-23T14:59:30.000Z")).toBe(
			"2026/08/23 23:59:30",
		);
	});

	it("keeps timezone-less calendar values unchanged", () => {
		expect(format("2026-08-23", false)).toBe("2026/08/23");
		expect(format("2026-08-23 23:59")).toBe("2026/08/23 23:59");
		expect(formatWithDay("2026-08-23 23:59", true)).toBe(
			"2026/08/23（日） 23:59",
		);
	});

	it("formats form values with schema-compatible separators", () => {
		expect(formatForForm("2026-08-23T14:59:00.000Z")).toBe("2026-08-23 23:59");
		expect(formatForForm("2026-08-23", false)).toBe("2026-08-23");
	});
});
