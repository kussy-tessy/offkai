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
import { hasSeriesRole } from "../../../authorization/event-access";
import { OffkaiEventRepository } from "../../../repository";

export function assignQuestionIds<T>(
	questions: T[],
	requestedIds: (QuestionId | undefined)[],
	existingIds: QuestionId[],
	generateId: () => QuestionId = () => uuidv7() as QuestionId,
): (T & { id: QuestionId })[] {
	const existing = new Set<QuestionId>(existingIds);
	const retained = new Set<QuestionId>();

	return questions.map((question, index) => {
		const requestedId = requestedIds[index];
		if (requestedId && existing.has(requestedId)) {
			if (retained.has(requestedId)) {
				throw new AppError("VALIDATION_ERROR", "同じ質問IDが重複しています。");
			}
			retained.add(requestedId);
			return { ...question, id: requestedId };
		}

		return { ...question, id: generateId() };
	});
}

export async function updateOffkaiEvent(
	params: GetOffkaiEventRequest,
	input: CreateOffkaiEventRequest,
	userId: UserId,
) {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(params.id);
	const seriesRole = await repository.findSeriesMemberRole(
		userId,
		event.seriesId,
	);

	if (!hasSeriesRole(seriesRole, "owner")) {
		throw new AppError("FORBIDDEN", "このオフ会を編集する権限がありません。");
	}
	if (
		(input.overviewVisibility === "GUILD_MEMBERS" ||
			input.participantsVisibility === "GUILD_MEMBERS") &&
		!(await repository.findSeriesDiscordGuildId(event.seriesId))
	) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordサーバー参加者限定にするには、シリーズのDiscordギルド設定が必要です。",
		);
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
				description: question.description,
				required: question.required,
				answerTemplate: question.answerTemplate,
			})),
		);

	const nextCommitmentQuestions = assignQuestionIds(
		commitmentWithoutId,
		input.commitmentQuestions.map((question) => question.id),
		event.commitmentQuestions.map((question) => question.id),
	);

	const nextPreferenceQuestions = assignQuestionIds(
		preferenceWithoutId,
		input.preferenceQuestions.map((question) => question.id),
		event.preferenceQuestions.map((question) => question.id),
	);

	const updated = runBusinessRule(() =>
		event.edit({
			name: input.title,
			eventPeriod: EventPeriodSchema.parse({
				startDate: new Date(input.eventPeriod.startDate),
				endDate: new Date(input.eventPeriod.endDate),
			}),
			applicationStartDate: ApplicationStartDateSchema.parse(
				new Date(input.applicationStartDate),
			),
			description: input.description,
			participantDescription: input.participantDescription,
			discordRoleId: input.discordRoleId,
			askBringingKigurumi: input.askBringingKigurumi,
			overviewVisibility: input.overviewVisibility,
			participantsVisibility: input.participantsVisibility,
			commitmentQuestions: nextCommitmentQuestions,
			preferenceQuestions: nextPreferenceQuestions,
		}),
	);

	await repository.save(updated);
	return updated;
}
