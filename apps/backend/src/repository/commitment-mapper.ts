import type {
	Capacity,
	CommitmentAnswer,
	CommitmentQuestion,
	Deadline,
	QuestionId,
} from "@offkai/core";

export type CommitmentAnswerRecord = {
	questionId: string;
	answer: boolean | null;
};

export function toDomainCommitmentAnswer(
	record: CommitmentAnswerRecord,
): CommitmentAnswer {
	return {
		questionId: record.questionId as QuestionId,
		answer:
			record.answer === null ? null : record.answer === true ? "yes" : "no",
	};
}

export function toDomainCommitmentQuestion(record: {
	id: string;
	question: string;
	questionShort: string;
	deadline: Date;
	description: string;
	capacity: number;
	required: boolean;
}): CommitmentQuestion {
	return {
		id: record.id as QuestionId,
		question: record.question,
		questionShort: record.questionShort,
		deadline: record.deadline as Deadline,
		description: record.description,
		capacity: record.capacity as Capacity,
		required: record.required,
	};
}

export function toPersistenceCommitmentAnswer(
	answer: CommitmentAnswer["answer"],
): boolean | null {
	return answer === null ? null : answer === "yes";
}
