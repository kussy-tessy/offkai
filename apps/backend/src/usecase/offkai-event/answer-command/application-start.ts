import {
	isPassed,
	type CommitmentAnswer,
	type OffkaiEvent,
} from "@offkai/core";
import { AppError } from "../../../app-error";

export function isApplicationStarted(event: OffkaiEvent, now = new Date()) {
	return (
		isPassed(now, event.applicationStartDate) ||
		now.getTime() === event.applicationStartDate.getTime()
	);
}

export function rejectBeforeApplicationStart(
	event: OffkaiEvent,
	now = new Date(),
) {
	if (isApplicationStarted(event, now)) return;

	throw new AppError(
		"APPLICATION_NOT_STARTED",
		"募集開始前のため参加表明できません。",
	);
}

export function rejectNewParticipationBeforeApplicationStart(
	event: OffkaiEvent,
	currentAnswers: CommitmentAnswer[],
	nextAnswers: CommitmentAnswer[],
	now = new Date(),
) {
	if (isApplicationStarted(event, now)) return;

	const currentByQuestionId = new Map(
		currentAnswers.map((answer) => [answer.questionId, answer.answer]),
	);
	const addsParticipation = nextAnswers.some(
		(answer) =>
			answer.answer === "yes" &&
			currentByQuestionId.get(answer.questionId) !== "yes",
	);
	if (!addsParticipation) return;

	throw new AppError(
		"APPLICATION_NOT_STARTED",
		"募集開始前のため、新たに参加へ変更できません。",
	);
}
