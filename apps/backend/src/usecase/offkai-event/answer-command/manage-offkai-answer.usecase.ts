import type {
	GetMyAnswerFormResponse,
	ManageOffkaiAnswerRequest,
	SaveOffkaiAnswerRequest,
	SaveOffkaiAnswerResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import {
	OffkaiAnswerRepository,
	OffkaiEventRepository,
	UserRepository,
} from "../../../repository";
import { OffkaiAnswerService } from "../../../service/offkai-answer.service";
import { getAnswerForm } from "./get-my-answer-form.usecase";

export async function getManagedOffkaiAnswerForm(
	input: ManageOffkaiAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	await requireEventOwner(input, ownerUserId);

	const answerRepository = new OffkaiAnswerRepository();
	const answer = await answerRepository.findByEventAndUser(
		input.eventId,
		input.userId,
	);
	if (!answer)
		throw new AppError("ANSWER_NOT_FOUND", "編集対象の回答が見つかりません。");

	const respondent = await new UserRepository().findById(input.userId);
	if (!respondent)
		throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");

	const form = await getAnswerForm(
		{ eventId: input.eventId },
		input.userId,
		true,
	);

	return {
		...form,
		respondent: {
			id: input.userId,
			displayName: respondent.name,
		},
	};
}

export async function saveManagedOffkaiAnswer(
	params: ManageOffkaiAnswerRequest,
	input: SaveOffkaiAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<SaveOffkaiAnswerResponse>> {
	await requireEventOwner(params, ownerUserId);

	const answer = await new OffkaiAnswerService().prepareForcedEditAnswerEntity(
		params.eventId,
		params.userId,
		input.commitmentAnswers,
		input.preferenceAnswers,
		input.bringingKigurumis,
	);

	await new OffkaiAnswerRepository().save(answer, ownerUserId);
	return { ok: true };
}

async function requireEventOwner(
	input: ManageOffkaiAnswerRequest,
	ownerUserId: UserId,
) {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	const role = await repository.findSeriesMemberRole(
		ownerUserId,
		event.seriesId,
	);

	if (!hasSeriesRole(role, "owner")) {
		throw new AppError("FORBIDDEN", "この回答を編集する権限がありません。");
	}
}
