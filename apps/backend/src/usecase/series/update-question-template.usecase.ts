import type {
	UpdateSeriesQuestionTemplateRequest,
	UpdateSeriesQuestionTemplateResponse,
	UserId,
} from "@offkai/core";
import { SeriesRepository } from "../../repository";

export async function updateQuestionTemplate(
	input: UpdateSeriesQuestionTemplateRequest,
	userId: UserId,
): Promise<UpdateSeriesQuestionTemplateResponse> {
	const repository = new SeriesRepository();
	const template = await repository.findQuestionTemplateByOwner(userId);
	const editedTemplate = template.edit({
		preferenceQuestions: input.preferenceQuestions,
	});

	await repository.saveQuestionTemplate(editedTemplate);

	return {
		preferenceQuestions: editedTemplate.preferenceQuestions,
	};
}
