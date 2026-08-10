import {
	AnswerIdSchema,
	CapacitySchema,
	CommitmentQuestionSchema,
	DeadlineSchema,
	OffkaiAnswer,
	OffkaiEventIdSchema,
	QuestionIdSchema,
	UserIdSchema,
} from "@offkai/core";
import { describe, expect, it } from "vitest";

const eventId = OffkaiEventIdSchema.parse(
	"00000000-0000-4000-8000-000000000010",
);
const userId = UserIdSchema.parse("00000000-0000-4000-8000-000000000011");
const questionId = QuestionIdSchema.parse(
	"00000000-0000-4000-8000-000000000012",
);

function answerParams(input: {
	answer: "yes" | "no" | null;
	deadline: Date;
	capacity: number;
	numberOfPeople: number;
}) {
	return {
		answer: {
			commitmentAnswers: [{ questionId, answer: input.answer }],
			preferenceAnswers: [],
			bringingKigurumis: [],
		},
		question: {
			eventId,
			askBringingKigurumi: false,
			commitmentQuestions: [
				{
					...CommitmentQuestionSchema.parse({
						id: questionId,
						question: "参加しますか",
						questionShort: "参加",
						deadline: DeadlineSchema.parse(input.deadline),
						description: "",
						capacity: CapacitySchema.parse(input.capacity),
						required: true,
					}),
					numberOfPeople: input.numberOfPeople,
				},
			],
			preferenceQuestions: [],
		},
	};
}

describe("回答の締切ルール", () => {
	it("締切後は必須質問でも未回答のまま新規参加表明できる", () => {
		const params = answerParams({
			answer: null,
			deadline: new Date(Date.now() - 60_000),
			capacity: 10,
			numberOfPeople: 0,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).not.toThrow();
	});

	it("締切後の新規参加回答を拒否する", () => {
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() - 60_000),
			capacity: 10,
			numberOfPeople: 0,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).toThrowError(
			"締切を過ぎています。",
		);
	});

	it("締切後の新規いいえ回答も拒否する", () => {
		const params = answerParams({
			answer: "no",
			deadline: new Date(Date.now() - 60_000),
			capacity: 10,
			numberOfPeople: 0,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).toThrowError(
			"締切を過ぎています。",
		);
	});

	it("締切後の参加可否変更を拒否する", () => {
		const existing = OffkaiAnswer.reconstruct({
			id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000013"),
			eventId,
			userId,
			commitmentAnswers: [{ questionId, answer: "yes" }],
			preferenceAnswers: [],
		});
		const params = answerParams({
			answer: "no",
			deadline: new Date(Date.now() - 60_000),
			capacity: 10,
			numberOfPeople: 1,
		});
		expect(() => existing.edit(params)).toThrowError(
			"締切を過ぎてから参加可否は変更できません。",
		);
	});
});

describe("回答の定員ルール", () => {
	it("定員到達後は必須質問でも未回答のまま新規参加表明できる", () => {
		const params = answerParams({
			answer: null,
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 2,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).not.toThrow();
	});

	it("定員に達した質問への新規参加回答を拒否する", () => {
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 2,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).toThrowError(
			"締切人数に到達しました。",
		);
	});

	it("定員到達後の新規いいえ回答も拒否する", () => {
		const params = answerParams({
			answer: "no",
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 2,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).toThrowError(
			"締切人数に到達しました。",
		);
	});

	it("残り1枠には参加回答できる", () => {
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 1,
		});
		expect(() => OffkaiAnswer.create({ ...params, userId })).not.toThrow();
	});

	it("定員超過中でも、はいからいいえへ変更できる", () => {
		const existing = OffkaiAnswer.reconstruct({
			id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000015"),
			eventId,
			userId,
			commitmentAnswers: [{ questionId, answer: "yes" }],
			preferenceAnswers: [],
		});
		const params = answerParams({
			answer: "no",
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 3,
		});
		expect(() => existing.edit(params)).not.toThrow();
	});

	it("定員超過中でも、はいから未回答へ変更できる", () => {
		const existing = OffkaiAnswer.reconstruct({
			id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000016"),
			eventId,
			userId,
			commitmentAnswers: [{ questionId, answer: "yes" }],
			preferenceAnswers: [],
		});
		const params = answerParams({
			answer: null,
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 3,
		});
		expect(() => existing.edit(params)).not.toThrow();
	});

	it("既に参加済みなら定員到達後も同じ回答を維持できる", () => {
		const existing = OffkaiAnswer.reconstruct({
			id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000014"),
			eventId,
			userId,
			commitmentAnswers: [{ questionId, answer: "yes" }],
			preferenceAnswers: [],
		});
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() + 60_000),
			capacity: 2,
			numberOfPeople: 2,
		});
		expect(() => existing.edit(params)).not.toThrow();
	});
});
