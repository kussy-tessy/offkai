import {
	ApplicationStartDateSchema,
	CommitmentQuestionSchema,
	CreateOffkaiEventRequest,
	EventDateSchema,
	OffkaiEvent,
	OffkaiSeriesIdSchema,
	PreferenceQuestionSchema,
} from "@offkai/core";
import { OffkaiEventRepository } from "../../repository";

export async function createOffkaiEvent(input: CreateOffkaiEventRequest) {
	const offkaiEvent = OffkaiEvent.create({
		seriesId: OffkaiSeriesIdSchema.parse(
			"c6b69aec-1562-9298-6d9e-ac504d32f5fb",
		),
		name: input.title,
		eventDate: EventDateSchema.parse(new Date(input.eventDate)),
		applicationStartDate: ApplicationStartDateSchema.parse(
			new Date(input.applicationStartDate),
		),
		description: input.description,
		commitmentQuestions:
			CommitmentQuestionSchema.omit({ id: true }).array().parse(
				input.commitmentQuestions.map((question) =>
				({
					...question,
					deadline: new Date(question.deadline)
				}))),
		preferenceQuestions:
			PreferenceQuestionSchema.omit({ id: true }).array().parse(
				input.preferenceQuestions),
	});
	await new OffkaiEventRepository().save(offkaiEvent);
	return offkaiEvent;
}
