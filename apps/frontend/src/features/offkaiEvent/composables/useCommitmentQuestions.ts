import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";

export type CommitmentQuestion = {
	id: string;
	question: string;
	questionShort: string;
	description: string;
	deadline: string;
	capacity: number | null;
};

export type CommitmentQuestionInitializeProps = {
	questions: (Omit<CommitmentQuestion, "id"> & { id?: string })[];
};

export const useCommitmentQuestions = () => {
	const questions = ref<CommitmentQuestion[]>([]);

	const addQuestion = () => {
		questions.value.push({
			id: uuidv4(),
			question: "",
			questionShort: "",
			description: "",
			deadline: "",
			capacity: null,
		});
	};

	const removeQuestion = (id: string) => {
		questions.value = questions.value.filter((q) => q.id !== id);
	};

	const updateQuestion = (id: string, updated: Partial<CommitmentQuestion>) => {
		const index = questions.value.findIndex((q) => q.id === id);
		if (index !== -1) {
			questions.value[index] = {
				...questions.value[index],
				...updated,
			};
		}
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
