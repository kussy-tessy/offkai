import {
	ApplicationStartDateSchema,
	EventDateSchema,
	EventPeriodSchema,
	OffkaiEvent,
	OffkaiEventIdSchema,
	OffkaiSeriesIdSchema,
	QuestionIdSchema,
} from "@offkai/core";
import { describe, expect, it } from "vitest";
import type { AppError } from "../../../app-error";
import {
	isApplicationStarted,
	rejectBeforeApplicationStart,
	rejectNewParticipationBeforeApplicationStart,
} from "./application-start";

const applicationStart = new Date("2030-04-01T09:00:00.000Z");
const questionId = QuestionIdSchema.parse(
	"00000000-0000-4000-8000-000000000003",
);
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

	it("募集開始前は既存回答を新たに参加へ変更できない", () => {
		expect(() =>
			rejectNewParticipationBeforeApplicationStart(
				event,
				[{ questionId, answer: "no" }],
				[{ questionId, answer: "yes" }],
				new Date(applicationStart.getTime() - 1),
			),
		).toThrowError(
			expect.objectContaining<Partial<AppError>>({
				code: "APPLICATION_NOT_STARTED",
			}),
		);
	});

	it("募集開始前でも既存の参加維持と取り下げはできる", () => {
		const now = new Date(applicationStart.getTime() - 1);
		expect(() =>
			rejectNewParticipationBeforeApplicationStart(
				event,
				[{ questionId, answer: "yes" }],
				[{ questionId, answer: "yes" }],
				now,
			),
		).not.toThrow();
		expect(() =>
			rejectNewParticipationBeforeApplicationStart(
				event,
				[{ questionId, answer: "yes" }],
				[{ questionId, answer: "no" }],
				now,
			),
		).not.toThrow();
	});

	it("募集開始後は既存回答を参加へ変更できる", () => {
		expect(() =>
			rejectNewParticipationBeforeApplicationStart(
				event,
				[{ questionId, answer: "no" }],
				[{ questionId, answer: "yes" }],
				new Date(applicationStart),
			),
		).not.toThrow();
	});
});
