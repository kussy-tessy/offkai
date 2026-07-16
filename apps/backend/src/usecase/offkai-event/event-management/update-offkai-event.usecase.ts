import {
	ApplicationStartDateSchema,
	CommitmentQuestionSchema,
	type CreateOffkaiEventRequest,
	EventPeriodSchema,
	type GetOffkaiEventRequest,
	PreferenceQuestionSchema,
	type QuestionId,
	type UserId,
} from "@offkai/core";
import { v7 as uuidv7 } from "uuid";
import { AppError, runBusinessRule } from "../../../app-error";
import { OffkaiEventRepository } from "../../../repository";

export async function updateOffkaiEvent(
	params: GetOffkaiEventRequest,
	input: CreateOffkaiEventRequest,
	userId: UserId,
) {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(params.id);
	const seriesRole = await repository.findSeriesMemberRole(userId, event.seriesId);

	if (seriesRole !== "owner") {
		throw new AppError("FORBIDDEN", "このオフ会を編集する権限がありません。");
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
				required: question.required,
				answerTemplate: question.answerTemplate,
			})),
		);

	const nextCommitmentQuestions = commitmentWithoutId.map((question, index) => ({
		...question,
		id: event.commitmentQuestions[index]?.id ?? (uuidv7() as QuestionId),
	}));

	const nextPreferenceQuestions = preferenceWithoutId.map((question, index) => ({
		...question,
		id: event.preferenceQuestions[index]?.id ?? (uuidv7() as QuestionId),
	}));

	const updated = runBusinessRule(() => event.edit({
		name: input.title,
		eventPeriod: EventPeriodSchema.parse({
			startDate: new Date(input.eventPeriod.startDate),
			endDate: new Date(input.eventPeriod.endDate),
		}),
		applicationStartDate: ApplicationStartDateSchema.parse(
			new Date(input.applicationStartDate),
		),
		description: input.description,
		discordRoleId: input.discordRoleId,
		askBringingKigurumi: input.askBringingKigurumi,
		commitmentQuestions: nextCommitmentQuestions,
		preferenceQuestions: nextPreferenceQuestions,
	}));

	await repository.save(updated);
	return updated;
}
