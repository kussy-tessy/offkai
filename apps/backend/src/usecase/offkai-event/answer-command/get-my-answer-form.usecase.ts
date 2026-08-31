import type {
	AnswerId,
	GetMyAnswerFormRequest,
	GetMyAnswerFormResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { formatForForm, isPassed } from "@offkai/core";
import { hasSeriesRole } from "../../../authorization/event-access";
import { getEventAuthorizationContext } from "../../../authorization/staff-permissions";
import {
	KigurumiRepository,
	OffkaiAnswerRepository,
	OffkaiEventRepository,
} from "../../../repository";
import {
	isApplicationStarted,
	rejectBeforeApplicationStart,
} from "./application-start";
import { requireParticipationEligibility } from "./participation-eligibility";

export async function getMyAnswerForm(
	input: GetMyAnswerFormRequest,
	userId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	return getAnswerForm(input, userId);
}

export async function getAnswerForm(
	input: GetMyAnswerFormRequest,
	userId: UserId | null,
	bypassBusinessRules = false,
	answerId?: AnswerId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	const eventRepository = new OffkaiEventRepository();
	const event = await eventRepository.findById(input.eventId);
	const seriesRole = userId
		? await eventRepository.findSeriesMemberRole(userId, event.seriesId)
		: null;
	const authorization = userId
		? await getEventAuthorizationContext(event.id, userId)
		: null;
	const canApplyBeforeStart =
		authorization?.role === "staff" &&
		authorization.permissions.allowApplicationBeforeStart;
	const canBypassParticipationRestrictions =
		bypassBusinessRules || hasSeriesRole(seriesRole, "owner");
	const answerRepository = new OffkaiAnswerRepository();
	const myAnswer = answerId
		? await answerRepository.findById(answerId)
		: userId
			? await answerRepository.findByEventAndUser(input.eventId, userId)
			: null;
	if (!canBypassParticipationRestrictions && !myAnswer) {
		if (!canApplyBeforeStart) rejectBeforeApplicationStart(event);
		if (!userId) {
			throw new Error("参加表明にはログインが必要です");
		}
		await requireParticipationEligibility(event, userId);
	}

	const [allAnswers, kigurumiOptions] = await Promise.all([
		answerRepository.findManyByEventId(input.eventId),
		userId
			? new KigurumiRepository().findManyByOwnerUserId(userId)
			: Promise.resolve([]),
	]);

	// 自分を除いた各 commitment question の "yes" 数を集計
	const counts = new Map<string, number>();
	for (const question of event.commitmentQuestions) {
		counts.set(question.id, 0);
	}
	for (const record of allAnswers) {
		if (record.id === myAnswer?.id) continue;
		for (const answer of record.commitmentAnswers) {
			if (answer.answer !== "yes") continue;
			counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
		}
	}

	const now = new Date();
	const applicationStarted = isApplicationStarted(event, now) || canApplyBeforeStart;

	const commitmentQuestions = event.commitmentQuestions.map((q) => {
		const currentCount = counts.get(q.id) ?? 0;
		const userAnswer =
			myAnswer?.commitmentAnswers.find((a) => a.questionId === q.id)?.answer ??
			null;
		const deadlinePassed = isPassed(now, q.deadline);
		const hasCapacity = currentCount < q.capacity;
		const canEditByQuestionRules =
			canBypassParticipationRestrictions ||
			(!deadlinePassed && (hasCapacity || userAnswer === "yes"));
		const canEdit =
			canEditByQuestionRules &&
			(canBypassParticipationRestrictions ||
				applicationStarted ||
				userAnswer === "yes");
		const canSelectYes = canEdit;
		const disableReason = canBypassParticipationRestrictions
			? undefined
			: deadlinePassed
				? ("deadlinePassed" as const)
				: !applicationStarted && userAnswer !== "yes"
					? ("applicationNotStarted" as const)
					: !hasCapacity && userAnswer !== "yes"
						? ("capacityFull" as const)
						: undefined;

		return {
			id: q.id,
			question: q.question,
			description: q.description,
			required: q.required,
			deadline: q.deadline.toISOString(),
			capacity: q.capacity,
			currentCount,
			canSelectYes,
			canEdit,
			disableReason,
			userAnswer,
		};
	});

	const preferenceQuestions = event.preferenceQuestions.map((q) => {
		const userAnswer =
			myAnswer?.preferenceAnswers.find((a) => a.questionId === q.id)?.answer ??
			null;

		return {
			id: q.id,
			question: q.question,
			description: q.description,
			required: q.required,
			answerTemplate: q.answerTemplate,
			userAnswer,
		};
	});

	return {
		canBypassParticipationRestrictions,
		event: {
			id: event.id,
			title: event.name,
			eventPeriod: {
				startDate: formatForForm(event.eventPeriod.startDate, false),
				endDate: formatForForm(event.eventPeriod.endDate, false),
			},
		},
		commitmentQuestions,
		preferenceQuestions,
		askBringingKigurumi: event.askBringingKigurumi,
		kigurumiOptions,
		bringingKigurumis: myAnswer?.bringingKigurumis ?? [],
	};
}
