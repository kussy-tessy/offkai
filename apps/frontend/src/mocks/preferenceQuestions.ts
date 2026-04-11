// mocks/preferenceQuestions.ts
import type { PreferenceQuestion } from "@/features/offkaiEvent/composables/usePreferenceQuestions";

export const mockPreferenceQuestions: PreferenceQuestion[] = [
	{
		id: "q1",
		question: "参加日はいつが都合いいですか？",
		answerTemplate: { type: "free" },
	},
	{
		id: "q2",
		question: "参加区分を選んでください",
		answerTemplate: {
			type: "choices",
			choices: ["昼のみ", "夜のみ", "両方"],
		},
	},
	{
		id: "q3",
		question: "アレルギーはありますか？",
		answerTemplate: {
			type: "choicesIncludingOther",
			choices: ["なし", "卵", "乳"],
		},
	},
];
