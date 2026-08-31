import type {
	UpdateSeriesQuestionTemplateRequest,
	UpdateSeriesQuestionTemplateResponse,
	UserId,
} from "@offkai/core";
import { SeriesRepository } from "../../repository";
import { AppError } from "../../app-error";

export async function updateQuestionTemplate(
	input: UpdateSeriesQuestionTemplateRequest,
	userId: UserId,
): Promise<UpdateSeriesQuestionTemplateResponse> {
	const repository = new SeriesRepository();
	const usesDiscord =
		input.overviewVisibility === "GUILD_MEMBERS" ||
		input.participantsVisibility === "GUILD_MEMBERS" ||
		input.participationEligibility === "GUILD_MEMBERS";
	if (usesDiscord && !(await repository.findSettingsByOwner(userId)).discordGuildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"Discordサーバー参加者限定にするには、シリーズのDiscordサーバー設定が必要です。",
		);
	}
	const template = await repository.findQuestionTemplateByOwner(userId);
	const editedTemplate = template.edit({
		preferenceQuestions: input.preferenceQuestions,
		askBringingKigurumi: input.askBringingKigurumi,
		overviewVisibility: input.overviewVisibility,
		participantsVisibility: input.participantsVisibility,
		participationEligibility: input.participationEligibility,
	});

	await repository.saveQuestionTemplate(editedTemplate);

	return {
		preferenceQuestions: editedTemplate.preferenceQuestions,
		askBringingKigurumi: editedTemplate.askBringingKigurumi,
		overviewVisibility: editedTemplate.overviewVisibility,
		participantsVisibility: editedTemplate.participantsVisibility,
		participationEligibility: editedTemplate.participationEligibility,
	};
}
