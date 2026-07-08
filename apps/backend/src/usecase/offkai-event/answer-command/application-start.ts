import { isPassed, type OffkaiEvent } from "@offkai/core";
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
