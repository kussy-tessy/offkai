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

describe("業務ルールの強制迂回", () => {
	it("強制作成では締切と定員を超えて参加回答できる", () => {
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() - 60_000),
			capacity: 1,
			numberOfPeople: 1,
		});
		expect(() => OffkaiAnswer.forceCreate({ ...params, userId })).not.toThrow();
	});

	it("強制作成でも必須の参加可否は未回答にできない", () => {
		const params = answerParams({
			answer: null,
			deadline: new Date(Date.now() + 60_000),
			capacity: 1,
			numberOfPeople: 0,
		});
		expect(() => OffkaiAnswer.forceCreate({ ...params, userId })).toThrowError(
			"必須の参加可否を選択してください。",
		);
	});

	it("強制編集では締切後でも参加可否を変更できる", () => {
		const existing = OffkaiAnswer.reconstruct({
			id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000017"),
			eventId,
			userId,
			commitmentAnswers: [{ questionId, answer: "no" }],
			preferenceAnswers: [],
		});
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() - 60_000),
			capacity: 1,
			numberOfPeople: 1,
		});
		expect(() => existing.forceEdit(params)).not.toThrow();
	});

	it("強制作成でも回答構造の検証は行う", () => {
		const params = answerParams({
			answer: "yes",
			deadline: new Date(Date.now() - 60_000),
			capacity: 1,
			numberOfPeople: 1,
		});
		params.answer.commitmentAnswers = [];
		expect(() => OffkaiAnswer.forceCreate({ ...params, userId })).toThrowError(
			"アンケートと回答が対応していません。",
		);
	});
});

describe("主催者による編集の必須チェック免除", () => {
	const preferenceId = QuestionIdSchema.parse(
		"00000000-0000-4000-8000-000000000020",
	);
	function fixture() {
		const base = answerParams({
			answer: null,
			deadline: new Date(Date.now() + 60_000),
			capacity: 10,
			numberOfPeople: 0,
		});
		return {
			answer: {
				...base.answer,
				preferenceAnswers: [
					{ questionId: preferenceId, answer: null as string | null },
				],
			},
			question: {
				...base.question,
				preferenceQuestions: [
					{
						id: preferenceId,
						question: "必須質問",
						questionShort: "必須",
						description: "",
						required: true,
						answerTemplate: { type: "free" as const },
					},
				],
			},
		};
	}
	const existing = OffkaiAnswer.reconstruct({
		id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000021"),
		eventId,
		userId,
		commitmentAnswers: [{ questionId, answer: "yes" }],
		preferenceAnswers: [],
	});

	it("参加可否とアンケートを未回答のまま保存できる（通常参加者・ゲスト）", () => {
		for (const target of [
			existing,
			OffkaiAnswer.reconstruct({
				...existing,
				userId: null,
				respondentName: "ゲスト",
			}),
		]) {
			const saved = target.forceEdit(fixture(), {
				bypassRequiredAnswers: true,
			});
			expect(saved.commitmentAnswers[0].answer).toBeNull();
			expect(saved.preferenceAnswers[0].answer).toBeNull();
		}
	});

	it("本人の通常編集と従来の強制編集では必須チェックを維持する", () => {
		const params = fixture();
		expect(() => existing.edit(params)).toThrow("必須の参加可否");
		expect(() => existing.forceEdit(params)).toThrow("必須の参加可否");
		params.answer.commitmentAnswers[0].answer = "yes";
		expect(() => existing.edit(params)).toThrow("必須のアンケート");
		expect(() => existing.forceEdit(params)).toThrow("必須のアンケート");
	});

	it("主催者の編集でも回答構造と文字数制限は維持する", () => {
		const params = fixture();
		params.answer.preferenceAnswers[0].answer = "あ".repeat(201);
		expect(() =>
			existing.forceEdit(params, { bypassRequiredAnswers: true }),
		).toThrow("200文字以内");
		params.answer.preferenceAnswers = [];
		expect(() =>
			existing.forceEdit(params, { bypassRequiredAnswers: true }),
		).toThrow("アンケートと回答が対応していません");
	});
});
