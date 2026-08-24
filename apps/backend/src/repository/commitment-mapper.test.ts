import { describe, expect, it } from "vitest";
import {
	toDomainCommitmentAnswer,
	toPersistenceCommitmentAnswer,
} from "./commitment-mapper";

describe("commitment mapper", () => {
	it.each([
		[true, "yes"],
		[false, "no"],
		[null, null],
	] as const)("DB value %s is exposed as %s", (answer, expected) => {
		expect(
			toDomainCommitmentAnswer({ questionId: "question-id", answer }),
		).toEqual({ questionId: "question-id", answer: expected });
	});

	it.each([
		["yes", true],
		["no", false],
		[null, null],
	] as const)("API value %s is persisted as %s", (answer, expected) => {
		expect(toPersistenceCommitmentAnswer(answer)).toBe(expected);
	});
});
