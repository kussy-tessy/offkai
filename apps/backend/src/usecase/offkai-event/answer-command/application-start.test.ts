import {
	ApplicationStartDateSchema,
	EventDateSchema,
	EventPeriodSchema,
	OffkaiEvent,
	OffkaiEventIdSchema,
	OffkaiSeriesIdSchema,
} from "@offkai/core";
import { describe, expect, it } from "vitest";
import type { AppError } from "../../../app-error";
import {
	isApplicationStarted,
	rejectBeforeApplicationStart,
} from "./application-start";

const applicationStart = new Date("2030-04-01T09:00:00.000Z");
const event = OffkaiEvent.reconstruct({
	id: OffkaiEventIdSchema.parse("00000000-0000-4000-8000-000000000001"),
	seriesId: OffkaiSeriesIdSchema.parse("00000000-0000-4000-8000-000000000002"),
	name: "境界値テスト用オフ会",
	eventPeriod: EventPeriodSchema.parse({
		startDate: EventDateSchema.parse(new Date("2030-05-01T00:00:00.000Z")),
		endDate: EventDateSchema.parse(new Date("2030-05-02T00:00:00.000Z")),
	}),
	description: "",
	applicationStartDate: ApplicationStartDateSchema.parse(applicationStart),
	discordRoleId: null,
	commitmentQuestions: [],
	preferenceQuestions: [],
});

describe("募集開始日時", () => {
	it("開始時刻の1ミリ秒前は募集開始前と判定する", () => {
		expect(
			isApplicationStarted(event, new Date(applicationStart.getTime() - 1)),
		).toBe(false);
	});

	it("開始時刻ちょうどは募集開始済みと判定する", () => {
		expect(isApplicationStarted(event, new Date(applicationStart))).toBe(true);
		expect(() =>
			rejectBeforeApplicationStart(event, new Date(applicationStart)),
		).not.toThrow();
	});

	it("募集開始前の参加表明を業務エラーとして拒否する", () => {
		expect(() =>
			rejectBeforeApplicationStart(
				event,
				new Date(applicationStart.getTime() - 1),
			),
		).toThrowError(
			expect.objectContaining<Partial<AppError>>({
				code: "APPLICATION_NOT_STARTED",
			}),
		);
	});
});
