import { v4 as uuidv7 } from "uuid";
import type {
	ApplicationStartDate,
	CommitmentQuestion,
	EventDate,
	OffkaiEventId,
	OffkaiSeriesId,
	PreferenceQuestion,
	QuestionId,
} from "../schema/index.js";
import { isPassed } from "../util/index.js";

export class OffkaiEvent {
	private constructor(
		readonly id: OffkaiEventId,
		readonly seriesId: OffkaiSeriesId,
		readonly name: string,
		readonly eventDate: EventDate,
		readonly description: string,
		readonly applicationStartDate: ApplicationStartDate,
		readonly commitmentQuestions: CommitmentQuestion[],
		readonly preferenceQuestions: PreferenceQuestion[],
	) {}

	static reconstruct(params: {
		id: OffkaiEventId;
		seriesId: OffkaiSeriesId;
		name: string;
		eventDate: EventDate;
		description: string;
		applicationStartDate: ApplicationStartDate;
		commitmentQuestions: CommitmentQuestion[];
		preferenceQuestions: PreferenceQuestion[];
	}) {
		return new OffkaiEvent(
			params.id,
			params.seriesId,
			params.name,
			params.eventDate,
			params.description,
			params.applicationStartDate,
			params.commitmentQuestions,
			params.preferenceQuestions,
		);
	}

	static create(params: {
		seriesId: OffkaiSeriesId;
		name: string;
		eventDate: EventDate;
		description: string;
		applicationStartDate: ApplicationStartDate;
		commitmentQuestions: Omit<CommitmentQuestion, "id">[];
		preferenceQuestions: Omit<PreferenceQuestion, "id">[];
	}): OffkaiEvent {
		if (isPassed(new Date(), params.eventDate)) {
			throw new Error("すでに開催日を過ぎています");
		}
		if (isPassed(new Date(), params.applicationStartDate)) {
			throw new Error("すでに募集開始日を過ぎています");
		}
		return new OffkaiEvent(
			uuidv7() as OffkaiEventId,
			params.seriesId,
			params.name,
			params.eventDate,
			params.description,
			params.applicationStartDate,
			params.commitmentQuestions.map((question) => ({
				...question,
				id: uuidv7() as QuestionId,
			})),
			params.preferenceQuestions.map((question) => ({
				...question,
				id: uuidv7() as QuestionId,
			})),
		);
	}

	edit(params: {
		name: string;
		eventDate: EventDate;
		description: string;
		applicationStartDate: ApplicationStartDate;
		commitmentQuestions: CommitmentQuestion[];
		preferenceQuestions: PreferenceQuestion[];
	}): OffkaiEvent {
		if (isPassed(new Date(), params.eventDate)) {
			throw new Error("すでに開催日を過ぎています");
		}
		if (isPassed(new Date(), params.applicationStartDate)) {
			throw new Error("すでに募集開始日を過ぎています");
		}
		return new OffkaiEvent(
			this.id,
			this.seriesId,
			params.name,
			params.eventDate,
			params.description,
			params.applicationStartDate,
			params.commitmentQuestions,
			params.preferenceQuestions,
		);
	}
}
