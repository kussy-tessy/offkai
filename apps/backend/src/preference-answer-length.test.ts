import {
	OffkaiAnswer,
	OffkaiEventIdSchema,
	PREFERENCE_ANSWER_OTHER_PREFIX,
	QuestionIdSchema,
	UserIdSchema,
} from "@offkai/core";
import { describe, expect, it } from "vitest";

const questionId = QuestionIdSchema.parse(
	"00000000-0000-4000-8000-000000000001",
);
const userId = UserIdSchema.parse("00000000-0000-4000-8000-000000000002");
function fixture(
	value: string,
	other = false,
): Parameters<typeof OffkaiAnswer.create>[0] {
	return {
		userId,
		answer: {
			commitmentAnswers: [],
			bringingKigurumis: [],
			preferenceAnswers: [{ questionId, answer: value }],
		},
		question: {
			eventId: OffkaiEventIdSchema.parse(
				"00000000-0000-4000-8000-000000000003",
			),
			askBringingKigurumi: false,
			commitmentQuestions: [],
			preferenceQuestions: [
				{
					id: questionId,
					question: "質問",
					questionShort: "質問",
					description: "",
					required: false,
					answerTemplate: other
						? { type: "choicesIncludingOther", choices: ["選択肢"] }
						: { type: "free" },
				},
			],
		},
	};
}
describe("自由回答の200文字制限", () => {
	for (const other of [false, true]) {
		it(`${other ? "その他の接頭辞を除いて" : "自由回答は"}200文字を許可し201文字を拒否する（本人・主催者・ゲスト）`, () => {
			const prefix = other ? PREFERENCE_ANSWER_OTHER_PREFIX : "";
			for (const create of [
				(p: ReturnType<typeof fixture>) => OffkaiAnswer.create(p),
				(p: ReturnType<typeof fixture>) => OffkaiAnswer.forceCreate(p),
				(p: ReturnType<typeof fixture>) =>
					OffkaiAnswer.forceCreateGuest({ ...p, respondentName: "ゲスト" }),
			]) {
				const saved = create(fixture(prefix + "あ".repeat(200), other));
				expect(() => create(fixture(prefix + "あ".repeat(201), other))).toThrow(
					"200文字以内",
				);
				expect(() =>
					saved.edit(fixture(prefix + "あ".repeat(201), other)),
				).toThrow("200文字以内");
				expect(() =>
					saved.forceEdit(fixture(prefix + "あ".repeat(201), other)),
				).toThrow("200文字以内");
			}
		});
	}
	it("自由回答に入力された『その他: 』は文字数に含める", () => {
		expect(() =>
			OffkaiAnswer.create(
				fixture(PREFERENCE_ANSWER_OTHER_PREFIX + "あ".repeat(200)),
			),
		).toThrow("200文字以内");
	});
	it("過去の長い回答は読み込める", () => {
		const saved = OffkaiAnswer.create(fixture("回答"));
		expect(
			OffkaiAnswer.reconstruct({
				...saved,
				preferenceAnswers: [{ questionId, answer: "あ".repeat(300) }],
			}).preferenceAnswers[0].answer,
		).toHaveLength(300);
	});
});
