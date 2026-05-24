import { isPassed, type OffkaiEvent } from "@offkai/core";

export function isApplicationStarted(event: OffkaiEvent, now = new Date()) {
	return isPassed(now, event.applicationStartDate) || now.getTime() === event.applicationStartDate.getTime();
}

export function rejectBeforeApplicationStart(event: OffkaiEvent, now = new Date()) {
	if (isApplicationStarted(event, now)) return;

	const error = new Error("募集開始前のため参加表明できません。");
	(error as Error & { statusCode: number }).statusCode = 403;
	throw error;
}
