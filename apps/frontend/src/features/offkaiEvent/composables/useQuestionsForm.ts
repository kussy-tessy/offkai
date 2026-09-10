import {
	CreateOffkaiEventRequestSchema,
	type CreateOffkaiEventRequest,
	type EventVisibility,
	type ParticipationEligibility,
	isVisibilityAtLeastAsRestricted,
	type Unbrand,
} from "@offkai/core";
import { watch } from "vue";
import {
	isEmpty,
	useField,
	useFieldErrorsComposable,
} from "@/common/composables";
import {
	type CommitmentQuestionInitializeProps,
	isBlankCommitmentQuestion,
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
	participationEligibility: ParticipationEligibility;
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
	const participationEligibility =
		useField<ParticipationEligibility>("AUTHENTICATED");

	// 子フォーム（サブコレクション）
	const commitment = useCommitmentQuestions();
	const preference = usePreferenceQuestions();

	const { errors, reset, hasAny } = useFieldErrorsComposable();

	const clearQuestionErrors = (prefix: string) => {
		for (const key of Object.keys(errors.value)) {
			if (key.startsWith(prefix)) delete errors.value[key];
		}
	};

	watch(
		() => commitment.questions.value.map((question) => question.id).join(","),
		() => clearQuestionErrors("commitmentQuestions."),
	);
	watch(
		() => preference.questions.value.map((question) => question.id).join(","),
		() => clearQuestionErrors("preferenceQuestions."),
	);

	const validate = () => {
		reset();
		if (isEmpty(title.value)) {
			errors.value.title = "タイトルを入力してください";
		}
		if (isEmpty(eventStartDate.value)) {
			errors.value.eventStartDate = "開始日を指定してください";
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
			if (isBlankCommitmentQuestion(question)) continue;

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

		// APIと同じ制約を検証する。空の参加表明質問は送信時に除外されるため、
		// エラーの添字を画面上の質問の位置に戻す。
		const commitmentIndexes = commitment.questions.value.flatMap(
			(question, index) => (isBlankCommitmentQuestion(question) ? [] : [index]),
		);
		const result = CreateOffkaiEventRequestSchema.safeParse(toPayload());
		if (!result.success) {
			for (const issue of result.error.issues) {
				const path = [...issue.path];
				if (path[0] === "commitmentQuestions" && typeof path[1] === "number") {
					path[1] = commitmentIndexes[path[1]];
				}
				let key = path.join(".");
				if (key === "eventPeriod.startDate") key = "eventStartDate";
				if (key === "eventPeriod.endDate") key = "eventEndDate";
				key = key.replace(".answerTemplate.choices", ".choices");
				if (errors.value[key]) continue;

				const field = String(path[path.length - 1]);
				const label =
					(
						{
							title: "タイトル",
							description: "説明",
							question: "質問",
							questionShort: "質問（見出し用）",
							capacity: "定員",
							startDate: "開始日",
							endDate: "終了日",
							applicationStartDate: "募集開始日時",
							deadline: "締切",
						} as Record<string, string>
					)[field] ?? "入力値";
				const isChoice = key.includes(".choices.");
				if (issue.code === "too_big") {
					errors.value[key] =
						issue.type === "string"
							? `${isChoice ? "選択肢" : label}は${issue.maximum}文字以内で入力してください`
							: `${label}は${issue.maximum}以下で入力してください`;
				} else if (issue.code === "too_small") {
					errors.value[key] = isChoice
						? "選択肢を入力してください"
						: `${label}を入力してください`;
				} else if (
					["startDate", "endDate", "applicationStartDate", "deadline"].includes(
						field,
					)
				) {
					errors.value[key] =
						issue.code === "custom" && field === "endDate"
							? issue.message
							: `${label}に有効な日付${field === "deadline" || field === "applicationStartDate" ? "・時刻" : ""}を入力してください`;
				} else {
					errors.value[key] =
						issue.code === "custom"
							? issue.message
							: `${label}を確認してください`;
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
		participationEligibility.set(props.participationEligibility);
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
			endDate: eventEndDate.value.value || eventStartDate.value.value,
		},
		applicationStartDate: applicationStartDate.value.value,
		description: description.value.value,
		discordRoleId: discordRoleId.value.value,
		askBringingKigurumi: askBringingKigurumi.value.value,
		overviewVisibility: overviewVisibility.value.value,
		participantsVisibility: participantsVisibility.value.value,
		participationEligibility: participationEligibility.value.value,
		commitmentQuestions: commitment.questions.value
			.filter((question) => !isBlankCommitmentQuestion(question))
			.map((question) => ({
				id: question.id,
				question: question.question,
				questionShort: question.questionShort,
				description: question.description,
				deadline: question.deadline,
				capacity: question.capacity as number,
				required: question.required,
			})),
		preferenceQuestions: preference.questions.value.map((question) => {
			const base = {
				id: question.id,
				question: question.question,
				description: question.description,
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
		participationEligibility,
		commitment,
		preference,
		initialize,
		validate,
		errors,
		toPayload,
	};
};
