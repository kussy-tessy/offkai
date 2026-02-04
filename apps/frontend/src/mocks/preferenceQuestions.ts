// mocks/preferenceQuestions.ts
import type { PreferenceQuestion } from "@/features/offkaiEvent/composables/usePreferenceQuestions";

export const mockPreferenceQuestions: PreferenceQuestion[] = [
	{
		id: "q1",
		question: "参加日はいつが都合いいですか？",
		answer: { type: "free" },
	},
	{
		id: "q2",
		question: "参加区分を選んでください",
		answer: {
			type: "choices",
			choices: ["昼のみ", "夜のみ", "両方"],
		},
	},
	{
		id: "q3",
		question: "アレルギーはありますか？",
		answer: {
			type: "choicesIncludingOther",
			choices: ["なし", "卵", "乳"],
		},
	},
];
