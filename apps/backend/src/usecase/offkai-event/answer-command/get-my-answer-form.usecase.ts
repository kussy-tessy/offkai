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
import { rejectBeforeApplicationStart } from "./application-start";

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
	if (!bypassBusinessRules && !hasSeriesRole(seriesRole, "owner")) {
		rejectBeforeApplicationStart(event);
	}

	const answerRepository = new OffkaiAnswerRepository();
	const [allAnswers, myAnswer, kigurumiOptions] = await Promise.all([
		answerRepository.findManyByEventId(input.eventId),
		answerRepository.findByEventAndUser(input.eventId, userId),
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

	const commitmentQuestions = event.commitmentQuestions.map((q) => {
		const currentCount = counts.get(q.id) ?? 0;
		const userAnswer =
			myAnswer?.commitmentAnswers.find((a) => a.questionId === q.id)?.answer ??
			null;
		const deadlinePassed = isPassed(now, q.deadline);
		const hasCapacity = currentCount < q.capacity;
		const canEdit =
			bypassBusinessRules ||
			(!deadlinePassed && (hasCapacity || userAnswer === "yes"));
		const canSelectYes = canEdit;
		const disableReason = bypassBusinessRules
			? undefined
			: deadlinePassed
				? ("deadlinePassed" as const)
				: !hasCapacity && userAnswer !== "yes"
					? ("capacityFull" as const)
					: undefined;

		return {
			id: q.id,
			question: q.question,
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
			required: q.required,
			answerTemplate: q.answerTemplate,
			userAnswer,
		};
	});

	return {
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
