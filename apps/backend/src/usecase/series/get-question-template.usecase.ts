import type { GetSeriesQuestionTemplateResponse, UserId } from "@offkai/core";
import { SeriesRepository } from "../../repository";

export async function getQuestionTemplate(
	userId: UserId,
): Promise<GetSeriesQuestionTemplateResponse> {
	const repository = new SeriesRepository();
	const template = await repository.findQuestionTemplateByOwner(userId);

	return {
		preferenceQuestions: template.preferenceQuestions,
		askBringingKigurumi: template.askBringingKigurumi,
		overviewVisibility: template.overviewVisibility,
		participantsVisibility: template.participantsVisibility,
		participationEligibility: template.participationEligibility,
	};
}
