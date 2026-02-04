import { ref } from "vue";
import { type FieldErrors, isEmpty, useField } from "@/common/composables";
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

	const errors = ref<FieldErrors>({});

	const validate = () => {
		errors.value = {};
		if (isEmpty(title.value)) {
			errors.value.title = "タイトルを入力してください";
		}
		if (isEmpty(eventDate.value)) {
			errors.value.eventDate = "開催日を指定してください";
		}
		if (isEmpty(applicationStartDate.value)) {
			errors.value.applicationStartDate = "募集開始日を指定してください";
		}
		// commitment.validate();
		// preference.validate();
		return Object.keys(errors.value).length === 0;
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

	const toPayload = () => ({
		title: title.value.value,
		eventDate: eventDate.value.value,
		applicationStartDate: applicationStartDate.value.value,
		description: description.value.value,
		commitmentQuestions: commitment.questions.value,
		preferenceQuestions: preference.questions.value,
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
