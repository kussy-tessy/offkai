import type { QuestionId } from "@offkai/core";
import { describe, expect, it } from "vitest";
import { assignQuestionIds } from "./update-offkai-event.usecase";

const id = (value: string) => value as QuestionId;

describe("assignQuestionIds", () => {
	it("keeps IDs attached to their questions when they are reordered", () => {
		const firstId = id("0198a4d8-cc8b-7000-8000-000000000001");
		const secondId = id("0198a4d8-cc8b-7000-8000-000000000002");

		const result = assignQuestionIds(
			[{ question: "second" }, { question: "first" }],
			[secondId, firstId],
			[firstId, secondId],
		);

		expect(result).toEqual([
			{ question: "second", id: secondId },
			{ question: "first", id: firstId },
		]);
	});

	it("generates a server ID for a new or unknown client ID", () => {
		const existingId = id("0198a4d8-cc8b-7000-8000-000000000001");
		const clientId = id("0198a4d8-cc8b-7000-8000-000000000002");
		const generatedId = id("0198a4d8-cc8b-7000-8000-000000000003");

		const result = assignQuestionIds(
			[{ question: "new" }],
			[clientId],
			[existingId],
			() => generatedId,
		);

		expect(result[0]?.id).toBe(generatedId);
	});

	it("rejects a duplicated existing question ID", () => {
		const existingId = id("0198a4d8-cc8b-7000-8000-000000000001");

		expect(() =>
			assignQuestionIds(
				[{ question: "one" }, { question: "two" }],
				[existingId, existingId],
				[existingId],
			),
		).toThrow("同じ質問IDが重複しています。");
	});
});
