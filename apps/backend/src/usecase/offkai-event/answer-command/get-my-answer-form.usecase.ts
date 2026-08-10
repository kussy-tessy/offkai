import type {
	GetMyAnswerFormRequest,
	GetMyAnswerFormResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { format, isPassed } from "@offkai/core";
import { hasSeriesRole } from "../../../authorization/event-access";
import {
	KigurumiRepository,
	OffkaiAnswerRepository,
	OffkaiEventRepository,
} from "../../../repository";
import {
	isApplicationStarted,
	rejectBeforeApplicationStart,
} from "./application-start";

export async function getMyAnswerForm(
	input: GetMyAnswerFormRequest,
	userId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	return getAnswerForm(input, userId);
}

export async function getAnswerForm(
	input: GetMyAnswerFormRequest,
	userId: UserId,
	bypassBusinessRules = false,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	const eventRepository = new OffkaiEventRepository();
	const event = await eventRepository.findById(input.eventId);
	const seriesRole = await eventRepository.findSeriesMemberRole(
		userId,
		event.seriesId,
	);
	const canBypassParticipationRestrictions =
		bypassBusinessRules || hasSeriesRole(seriesRole, "owner");
	const answerRepository = new OffkaiAnswerRepository();
	const myAnswer = await answerRepository.findByEventAndUser(
		input.eventId,
		userId,
	);
	if (!canBypassParticipationRestrictions && !myAnswer) {
		rejectBeforeApplicationStart(event);
	}

	const [allAnswers, kigurumiOptions] = await Promise.all([
		answerRepository.findManyByEventId(input.eventId),
		new KigurumiRepository().findManyByOwnerUserId(userId),
	]);

	// 自分を除いた各 commitment question の "yes" 数を集計
	const counts = new Map<string, number>();
	for (const question of event.commitmentQuestions) {
		counts.set(question.id, 0);
	}
	for (const record of allAnswers) {
		if (record.userId === userId) continue;
		const answers = record.commitmentAnswers as Array<{
			questionId: string;
			answer: "yes" | "no" | null;
		}>;
		for (const answer of answers) {
			if (answer.answer !== "yes") continue;
			counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
		}
	}

	const now = new Date();
	const applicationStarted = isApplicationStarted(event, now);

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
				startDate: format(event.eventPeriod.startDate, false),
				endDate: format(event.eventPeriod.endDate, false),
			},
		},
		commitmentQuestions,
		preferenceQuestions,
		askBringingKigurumi: event.askBringingKigurumi,
		kigurumiOptions,
		bringingKigurumis: myAnswer?.bringingKigurumis ?? [],
	};
}
