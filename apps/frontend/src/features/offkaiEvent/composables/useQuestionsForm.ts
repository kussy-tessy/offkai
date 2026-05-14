import type { CreateOffkaiEventRequest, Unbrand } from "@offkai/core";
import {
	isEmpty,
	useField,
	useFieldErrorsComposable,
} from "@/common/composables";
import {
	type CommitmentQuestion,
	useCommitmentQuestions,
} from "./useCommitmentQuestions";
import {
	type PreferenceQuestion,
	usePreferenceQuestions,
} from "./usePreferenceQuestions";

export type OffkaiEventInitializeProps = {
	title: string;
	eventDate: string;
	applicationStartDate: string;
	description: string;
	commitmentQuestions: CommitmentQuestion[];
	preferenceQuestions: PreferenceQuestion[];
};

export const useQuestionsForm = () => {
	const title = useField("");
	const eventDate = useField("");
	const applicationStartDate = useField("");
	const description = useField("");

	// 子フォーム（サブコレクション）
	const commitment = useCommitmentQuestions();
	const preference = usePreferenceQuestions();

	const { errors, reset, hasAny } = useFieldErrorsComposable();

	const validate = () => {
		reset();
		if (isEmpty(title.value)) {
			errors.value.title = "タイトルを入力してください";
		}
		if (isEmpty(eventDate.value)) {
			errors.value.eventDate = "開催日を指定してください";
		}
		if (isEmpty(applicationStartDate.value)) {
			errors.value.applicationStartDate = "募集開始日を指定してください";
		}

		for (const [index, question] of commitment.questions.value.entries()) {
			if (isEmpty(question.question)) {
				errors.value[`commitmentQuestions.${index}.question`] =
					"参加表明質問を入力してください";
			}
			if (isEmpty(question.questionShort)) {
				errors.value[`commitmentQuestions.${index}.questionShort`] =
					"見出し用の短い質問を入力してください";
			}
			if (isEmpty(question.deadline)) {
				errors.value[`commitmentQuestions.${index}.deadline`] =
					"締切を入力してください";
			}
			if (question.capacity === null || question.capacity < 1) {
				errors.value[`commitmentQuestions.${index}.capacity`] =
					"定員は1以上の数値を入力してください";
			}
		}

		for (const [index, question] of preference.questions.value.entries()) {
			if (isEmpty(question.question)) {
				errors.value[`preferenceQuestions.${index}.question`] =
					"アンケート質問を入力してください";
			}

			if (question.answerTemplate.type !== "free") {
				const choices = question.answerTemplate.choices ?? [];
				const hasEmptyChoice = choices.some(isEmpty);
				if (hasEmptyChoice) {
					errors.value[`preferenceQuestions.${index}.choices`] =
						"選択肢の空欄を埋めてください";
				}
			}
		}

		return !hasAny();
	};

	const initialize = (props: OffkaiEventInitializeProps) => {
		title.set(props.title);
		eventDate.set(props.eventDate);
		applicationStartDate.set(props.applicationStartDate);
		description.set(props.description);
		commitment.initialize({
			questions: props.commitmentQuestions,
		});
		preference.initialize({
			questions: props.preferenceQuestions,
		});
	};

	const toPayload = (): Unbrand<CreateOffkaiEventRequest> => ({
		title: title.value.value,
		eventDate: eventDate.value.value,
		applicationStartDate: applicationStartDate.value.value,
		description: description.value.value,
		commitmentQuestions: commitment.questions.value.map((question) => ({
			question: question.question,
			questionShort: question.questionShort,
			description: question.description,
			deadline: question.deadline,
			capacity: question.capacity as number,
			required: question.required,
		})),
		preferenceQuestions: preference.questions.value.map((question) => ({
			question: question.question,
			required: question.required,
			answerTemplate:
				question.answerTemplate.type === "free"
					? { type: "free" }
					: {
						type: question.answerTemplate.type,
						choices: question.answerTemplate.choices,
					},
		})),
	});

	return {
		title,
		eventDate,
		applicationStartDate,
		description,
		commitment,
		preference,
		initialize,
		validate,
		errors,
		toPayload,
	};
};
