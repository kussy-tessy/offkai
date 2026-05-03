import type { PreferenceQuestionWithAnswer, Unbrand } from "@offkai/core";

export const mockPreferenceQuestionsWithAnswer: Unbrand<PreferenceQuestionWithAnswer>[] =
  [
    {
      id: "q1",
      question: "参加日はいつが都合いいですか？",
      answerTemplate: { type: "free" },
      userAnswer: "2025年10月15日", // 既存回答あり
    },
    {
      id: "q2",
      question: "参加区分を選んでください",
      answerTemplate: {
        type: "choices",
        choices: ["昼のみ", "夜のみ", "両方"],
      },
      userAnswer: "両方", // 既存回答あり
    },
    {
      id: "q3",
      question: "アレルギーはありますか？",
      answerTemplate: {
        type: "choicesIncludingOther",
        choices: ["なし", "卵", "乳"],
      },
      userAnswer: null, // 新規回答
    },
  ];
