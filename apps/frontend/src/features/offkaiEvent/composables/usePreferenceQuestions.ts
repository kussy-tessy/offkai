import { v7 as uuidv7 } from "uuid";
import { ref } from "vue";

export type PreferenceQuestion = {
	id: string;
	question: string;
	required: boolean;
	answerTemplate: {
		type: "free" | "choices" | "choicesIncludingOther";
		choices?: string[];
	};
};

export type PreferenceQuestionInitializeProps = {
	questions: (Omit<PreferenceQuestion, "id"> & { id?: string })[];
};

export const usePreferenceQuestions = () => {
	const questions = ref<PreferenceQuestion[]>([]);

	const addQuestion = () => {
		questions.value.push({
			id: uuidv7(),
			question: "",
			required: false,
			answerTemplate: { type: "free" },
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

	const initialize = (props: PreferenceQuestionInitializeProps) => {
		questions.value = props.questions.map((q) => ({
			...q,
			id: q.id ?? uuidv7(),
			required: q.required ?? false,
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
