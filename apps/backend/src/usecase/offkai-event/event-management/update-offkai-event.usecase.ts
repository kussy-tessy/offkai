import {
	ApplicationStartDateSchema,
	CommitmentQuestionSchema,
	type CreateOffkaiEventRequest,
	EventDateSchema,
	type GetOffkaiEventRequest,
	PreferenceQuestionSchema,
	type QuestionId,
	type UserId,
} from "@offkai/core";
import { v7 as uuidv7 } from "uuid";
import { OffkaiEventRepository } from "../../../repository";

export async function updateOffkaiEvent(
	params: GetOffkaiEventRequest,
	input: CreateOffkaiEventRequest,
	userId: UserId,
) {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(params.id);
	const ownerSeriesId = await repository.findOwnerSeriesId(userId);

	if (event.seriesId !== ownerSeriesId) {
		throw new Error("このオフ会を編集する権限がありません");
	}

	const commitmentWithoutId = CommitmentQuestionSchema.omit({ id: true })
		.array()
		.parse(
			input.commitmentQuestions.map((question) => ({
				...question,
				deadline: new Date(question.deadline),
			})),
		);

	const preferenceWithoutId = PreferenceQuestionSchema.omit({ id: true })
		.array()
		.parse(
			input.preferenceQuestions.map((question) => ({
				question: question.question,
				questionShort: question.question,
				answerTemplate: question.answerTemplate,
			})),
		);

	const updated = event.edit({
		name: input.title,
		eventDate: EventDateSchema.parse(new Date(input.eventDate)),
		applicationStartDate: ApplicationStartDateSchema.parse(
			new Date(input.applicationStartDate),
		),
		description: input.description,
		commitmentQuestions: commitmentWithoutId.map((question, index) => ({
			...question,
			id: event.commitmentQuestions[index]?.id ?? (uuidv7() as QuestionId),
		})),
		preferenceQuestions: preferenceWithoutId.map((question, index) => ({
			...question,
			id: event.preferenceQuestions[index]?.id ?? (uuidv7() as QuestionId),
		})),
	});

	await repository.save(updated);
	return updated;
}