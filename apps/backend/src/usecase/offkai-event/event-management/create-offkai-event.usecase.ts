import {
	ApplicationStartDateSchema,
	CommitmentQuestionSchema,
	type CreateOffkaiEventRequest,
	EventPeriodSchema,
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
		eventPeriod: EventPeriodSchema.parse({
			startDate: new Date(input.eventPeriod.startDate),
			endDate: new Date(input.eventPeriod.endDate),
		}),
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
					required: question.required,
					answerTemplate: question.answerTemplate,
				}))),
	});
	await repository.save(offkaiEvent);
	return offkaiEvent;
}
