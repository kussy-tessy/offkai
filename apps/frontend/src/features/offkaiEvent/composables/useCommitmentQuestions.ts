import { v7 as uuidv7 } from "uuid";
import { ref } from "vue";

export type CommitmentQuestion = {
	id: string;
	question: string;
	questionShort: string;
	description: string;
	deadline: string;
	capacity: number | null;
	required: boolean;
};

export type CommitmentQuestionInitializeProps = {
	questions: (Omit<CommitmentQuestion, "id"> & { id?: string })[];
};

export const isBlankCommitmentQuestion = (question: CommitmentQuestion) =>
	question.question.trim() === "" &&
	question.questionShort.trim() === "" &&
	question.description.trim() === "" &&
	question.deadline === "" &&
	question.capacity === null &&
	!question.required;

export const useCommitmentQuestions = () => {
	const questions = ref<CommitmentQuestion[]>([]);

	const addQuestion = () => {
		questions.value.push({
			id: uuidv7(),
			question: "",
			questionShort: "",
			description: "",
			deadline: "",
			capacity: null,
			required: false,
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

	const moveQuestion = (id: string, offset: -1 | 1) => {
		const index = questions.value.findIndex((q) => q.id === id);
		const destination = index + offset;
		if (
			index === -1 ||
			destination < 0 ||
			destination >= questions.value.length
		) {
			return;
		}

		const next = questions.value.slice();
		[next[index], next[destination]] = [next[destination], next[index]];
		questions.value = next;
	};

	const initialize = (props: CommitmentQuestionInitializeProps) => {
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
		moveQuestion,
	};
};
