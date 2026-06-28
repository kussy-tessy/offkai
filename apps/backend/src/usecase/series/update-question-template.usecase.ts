import type { SeriesQuestionTemplate, UserId } from "@offkai/core";
import { SeriesRepository } from "../../repository";

export async function updateQuestionTemplate(
	input: SeriesQuestionTemplate,
	userId: UserId,
): Promise<SeriesQuestionTemplate> {
	const repository = new SeriesRepository();
	return repository.updateQuestionTemplateByOwner(userId, input);
}
