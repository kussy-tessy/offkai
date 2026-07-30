import {
	isVisibilityAtLeastAsRestricted,
	type CreateOffkaiEventRequest,
	type EventVisibility,
	type Unbrand,
} from "@offkai/core";
import {
	isEmpty,
	useField,
	useFieldErrorsComposable,
} from "@/common/composables";
import {
	type CommitmentQuestionInitializeProps,
	useCommitmentQuestions,
} from "./useCommitmentQuestions";
import {
	type PreferenceQuestionInitializeProps,
	usePreferenceQuestions,
} from "./usePreferenceQuestions";

export type OffkaiEventInitializeProps = {
	title: string;
	eventPeriod: {
		startDate: string;
		endDate: string;
	};
	applicationStartDate: string;
	description: string;
	discordRoleId: string | null;
	askBringingKigurumi: boolean;
	overviewVisibility: EventVisibility;
	participantsVisibility: EventVisibility;
	commitmentQuestions: CommitmentQuestionInitializeProps["questions"];
	preferenceQuestions: PreferenceQuestionInitializeProps["questions"];
};

export const useQuestionsForm = () => {
	const title = useField("");
	const eventStartDate = useField("");
	const eventEndDate = useField("");
	const applicationStartDate = useField("");
	const description = useField("");
	const discordRoleId = useField<string | null>(null);
	const askBringingKigurumi = useField(false);
	const overviewVisibility = useField<EventVisibility>("AUTHENTICATED");
	const participantsVisibility = useField<EventVisibility>("AUTHENTICATED");

	// 子フォーム（サブコレクション）
	const commitment = useCommitmentQuestions();
	const preference = usePreferenceQuestions();

	const { errors, reset, hasAny } = useFieldErrorsComposable();

	const validate = () => {
		reset();
		if (isEmpty(title.value)) {
			errors.value.title = "タイトルを入力してください";
		}
		if (isEmpty(eventStartDate.value)) {
			errors.value.eventStartDate = "開始日を指定してください";
		}
		if (isEmpty(eventEndDate.value)) {
			errors.value.eventEndDate = "終了日を指定してください";
		}
		if (
			!isEmpty(eventStartDate.value) &&
			!isEmpty(eventEndDate.value) &&
			eventEndDate.value.value < eventStartDate.value.value
		) {
			errors.value.eventEndDate = "終了日は開始日以降にしてください";
		}
		if (isEmpty(applicationStartDate.value)) {
			errors.value.applicationStartDate = "募集開始日を指定してください";
		}
		if (
			!isVisibilityAtLeastAsRestricted(
				participantsVisibility.value.value,
				overviewVisibility.value.value,
			)
		) {
			errors.value.participantsVisibility =
				"参加者一覧・回答の公開範囲は、オフ会概要と同じか、より限定してください";
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
				if (choices.length === 0) {
					errors.value[`preferenceQuestions.${index}.choices`] =
						"選択肢を1つ以上追加してください";
				} else if (hasEmptyChoice) {
					errors.value[`preferenceQuestions.${index}.choices`] =
						"選択肢の空欄を埋めてください";
				}
			}
		}

		return !hasAny();
	};

	const initialize = (props: OffkaiEventInitializeProps) => {
		title.set(props.title);
		eventStartDate.set(props.eventPeriod.startDate);
		eventEndDate.set(props.eventPeriod.endDate);
		applicationStartDate.set(props.applicationStartDate);
		description.set(props.description);
		discordRoleId.set(props.discordRoleId);
		askBringingKigurumi.set(props.askBringingKigurumi);
		overviewVisibility.set(props.overviewVisibility);
		participantsVisibility.set(props.participantsVisibility);
		commitment.initialize({
			questions: props.commitmentQuestions,
		});
		preference.initialize({
			questions: props.preferenceQuestions,
		});
	};

	const toPayload = (): Unbrand<CreateOffkaiEventRequest> => ({
		title: title.value.value,
		eventPeriod: {
			startDate: eventStartDate.value.value,
			endDate: eventEndDate.value.value,
		},
		applicationStartDate: applicationStartDate.value.value,
		description: description.value.value,
		discordRoleId: discordRoleId.value.value,
		askBringingKigurumi: askBringingKigurumi.value.value,
		overviewVisibility: overviewVisibility.value.value,
		participantsVisibility: participantsVisibility.value.value,
		commitmentQuestions: commitment.questions.value.map((question) => ({
			question: question.question,
			questionShort: question.questionShort,
			description: question.description,
			deadline: question.deadline,
			capacity: question.capacity as number,
			required: question.required,
		})),
		preferenceQuestions: preference.questions.value.map((question) => {
			const base = {
				question: question.question,
				required: question.required,
			};

			if (question.answerTemplate.type === "free") {
				return {
					...base,
					answerTemplate: { type: "free" as const },
				};
			}

			if (question.answerTemplate.type === "choices") {
				return {
					...base,
					answerTemplate: {
						type: "choices" as const,
						choices: question.answerTemplate.choices ?? [],
					},
				};
			}

			return {
				...base,
				answerTemplate: {
					type: "choicesIncludingOther" as const,
					choices: question.answerTemplate.choices ?? [],
				},
			};
		}),
	});

	return {
		title,
		eventStartDate,
		eventEndDate,
		applicationStartDate,
		description,
		discordRoleId,
		askBringingKigurumi,
		overviewVisibility,
		participantsVisibility,
		commitment,
		preference,
		initialize,
		validate,
		errors,
		toPayload,
	};
};
