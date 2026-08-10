import { v7 as uuidv7 } from "uuid";
import { ref } from "vue";

export type PreferenceQuestion = {
	id: string;
	question: string;
	description: string;
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
			description: "",
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

	const moveQuestion = (id: string, offset: -1 | 1) => {
		const index = questions.value.findIndex((q) => q.id === id);
		const destination = index + offset;
		if (index === -1 || destination < 0 || destination >= questions.value.length) {
			return;
		}

		const next = questions.value.slice();
		[next[index], next[destination]] = [next[destination], next[index]];
		questions.value = next;
	};

	const initialize = (props: PreferenceQuestionInitializeProps) => {
		questions.value = props.questions.map((q) => ({
			...q,
			id: q.id ?? uuidv7(),
			description: q.description ?? "",
			required: q.required ?? false,
		}));
	};

	return {
		questions,
		initialize,
		addQuestion,
		removeQuestion,
		updateQuestion,
		moveQuestion,
	};
};
