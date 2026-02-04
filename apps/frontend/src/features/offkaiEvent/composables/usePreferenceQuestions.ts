import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";

export type PreferenceQuestion = {
	id: string;
	question: string;
	answer: {
		type: "free" | "choices" | "choicesIncludingOther";
		choices?: string[];
	};
};

export type CommitmentQuestionInitializeProps = {
	questions: (Omit<PreferenceQuestion, "id"> & { id?: string })[];
};

export const usePreferenceQuestions = () => {
	const questions = ref<PreferenceQuestion[]>([]);

	const addQuestion = () => {
		questions.value.push({
			id: uuidv4(),
			question: "",
			answer: { type: "free" },
		});
	};

	const removeQuestion = (id: string) => {
		questions.value = questions.value.filter((q) => q.id !== id);
	};

	const updateQuestion = (id: string, patch: Partial<PreferenceQuestion>) => {
		const index = questions.value.findIndex((q) => q.id === id);
		if (index === -1) return;

		questions.value[index] = {
			...questions.value[index],
			...patch,
		};
	};

	const initialize = (props: CommitmentQuestionInitializeProps) => {
		questions.value = props.questions.map((q) => ({
			...q,
			id: q.id ?? uuidv4(),
		}));
	};

	return {
		questions,
		initialize,
		addQuestion,
		removeQuestion,
		updateQuestion,
	};
};
