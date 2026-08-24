import type { PreferenceQuestionWithAnswer } from "@offkai/core";
import { type Ref, ref } from "vue";

export function usePreferenceAnswers(
	questions: PreferenceQuestionWithAnswer[],
) {
	const answers: Ref<Record<string, string>> = ref({});

	// 初期値として既存回答を設定
	for (const q of questions) {
		if (q.userAnswer !== null) {
			answers.value[q.id] = q.userAnswer;
		}
	}

	const updateAnswer = (questionId: string, value: string) => {
		answers.value[questionId] = value;
	};

	return {
		answers,
		updateAnswer,
	};
}
