import type { CommitmentQuestionHeader, Unbrand } from "@offkai/core";

export function summarizeCommitments(
	questions: Unbrand<CommitmentQuestionHeader>[],
	now: number,
) {
	const open = questions.filter(
		(question) =>
			!(question.deadline && new Date(question.deadline).getTime() < now) &&
			!(question.capacity !== null && question.yesCount >= question.capacity),
	);
	const closedCount = questions.length - open.length;
	const deadline = open
		.filter((question) => question.deadline !== null)
		.sort(
			(a, b) =>
				new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
		)[0];
	const capacity = open
		.filter((question) => question.capacity !== null)
		.sort((a, b) => a.capacity! - a.yesCount - (b.capacity! - b.yesCount))[0];
	return {
		status:
			closedCount === 0 ? null : open.length === 0 ? "締切済" : "一部締切済",
		deadline,
		capacity,
	};
}
