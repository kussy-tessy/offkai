import type { CommitmentQuestionWithAnswer } from "@offkai/core";
import { type Ref, ref } from "vue";

export function useCommitmentAnswers(
	questions: CommitmentQuestionWithAnswer[],
) {
	const answers: Ref<Record<string, "yes" | "no" | null>> = ref({});

	// 初期値として既存回答を設定
	for (const q of questions) {
		if (q.userAnswer !== null) {
			answers.value[q.id] = q.userAnswer;
		}
	}

	const updateAnswer = (questionId: string, value: "yes" | "no" | null) => {
		answers.value[questionId] = value;
	};

	return {
		answers,
		updateAnswer,
	};
}
