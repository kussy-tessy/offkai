import {
	CreateOffkaiEventRequestSchema,
	UpdateParticipantGuideRequestSchema,
} from "@offkai/core";
import { describe, expect, it } from "vitest";

const event = {
	title: "オフ会",
	eventPeriod: { startDate: "2026-09-10", endDate: "2026-09-10" },
	applicationStartDate: "2026-09-01 12:00",
	commitmentQuestions: [],
	preferenceQuestions: [],
};

describe("オフ会の長文入力", () => {
	it.each([1000, 1001, 10000, 10001])("説明の%s文字を検証する", (length) => {
		expect(
			CreateOffkaiEventRequestSchema.safeParse({
				...event,
				description: "あ".repeat(length),
			}).success,
		).toBe(length <= 10000);
		expect(
			UpdateParticipantGuideRequestSchema.shape.description.safeParse(
				"あ".repeat(length),
			).success,
		).toBe(length <= 10000);
	});
	it("質問の説明は引き続き500文字までに制限する", () => {
		const result = CreateOffkaiEventRequestSchema.safeParse({
			...event,
			description: "",
			preferenceQuestions: [
				{
					question: "質問",
					description: "あ".repeat(501),
					answerTemplate: { type: "free" },
				},
			],
		});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues[0].path).toEqual([
				"preferenceQuestions",
				0,
				"description",
			]);
	});
});
