import {
	ApplicationStartDateSchema,
	CommitmentQuestionSchema,
	type CreateOffkaiEventRequest,
	EventPeriodSchema,
	OffkaiEvent,
	PreferenceQuestionSchema,
	type UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { OffkaiEventRepository } from "../../../repository";

export async function createOffkaiEvent(input: CreateOffkaiEventRequest, userId: UserId) {
	const repository = new OffkaiEventRepository();
	const seriesId = await repository.findOwnerSeriesId(userId);
	if (
		(input.overviewVisibility === "GUILD_MEMBERS" ||
			input.participantsVisibility === "GUILD_MEMBERS") &&
		!(await repository.findSeriesDiscordGuildId(seriesId))
	) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordサーバー参加者限定にするには、シリーズのDiscordギルド設定が必要です。",
		);
	}

	const offkaiEvent = runBusinessRule(() => OffkaiEvent.create({
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
		discordRoleId: input.discordRoleId,
		askBringingKigurumi: input.askBringingKigurumi,
		overviewVisibility: input.overviewVisibility,
		participantsVisibility: input.participantsVisibility,
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
					description: question.description,
					required: question.required,
					answerTemplate: question.answerTemplate,
				}))),
	}));
	await repository.save(offkaiEvent);
	return offkaiEvent;
}
