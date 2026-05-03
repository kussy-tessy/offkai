import {
	ApplicationStartDateSchema,
	CommitmentQuestionSchema,
	type CreateOffkaiEventRequest,
	EventDateSchema,
	OffkaiEvent,
	PreferenceQuestionSchema,
	type UserId,
} from "@offkai/core";
import { OffkaiEventRepository } from "../../../repository";

export async function createOffkaiEvent(input: CreateOffkaiEventRequest, userId: UserId) {
	const repository = new OffkaiEventRepository();
	const seriesId = await repository.findOwnerSeriesId(userId);

	const offkaiEvent = OffkaiEvent.create({
		seriesId,
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
				input.preferenceQuestions.map((question) => ({
					question: question.question,
					questionShort: question.question,
					answerTemplate: question.answerTemplate,
				}))),
	});
	await repository.save(offkaiEvent);
	return offkaiEvent;
}
