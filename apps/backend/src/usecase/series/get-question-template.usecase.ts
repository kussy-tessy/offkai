import type { SeriesQuestionTemplate, UserId } from "@offkai/core";
import { SeriesRepository } from "../../repository";

export async function getQuestionTemplate(
	userId: UserId,
): Promise<SeriesQuestionTemplate> {
	const repository = new SeriesRepository();
	return repository.getQuestionTemplateByOwner(userId);
}
