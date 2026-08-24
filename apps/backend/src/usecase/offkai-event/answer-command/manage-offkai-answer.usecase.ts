import type {
	GetMyAnswerFormResponse,
	ManageGuestAnswerRequest,
	ManageOffkaiAnswerRequest,
	SaveGuestAnswerRequest,
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

	const form = await getAnswerForm(
		{ eventId: input.eventId },
		input.userId,
		true,
	);

	return {
		...form,
		respondent: {
			id: input.userId,
			displayName: answer.respondentName ?? "",
			isGuest: false,
		},
	};
}

export async function getManagedGuestAnswerForm(
	input: ManageGuestAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	await requireEventOwner(input, ownerUserId);
	const answer = await new OffkaiAnswerRepository().findById(input.answerId);
	if (!answer || answer.eventId !== input.eventId || answer.userId !== null)
		throw new AppError(
			"ANSWER_NOT_FOUND",
			"編集対象のゲスト回答が見つかりません。",
		);
	const form = await getAnswerForm(
		{ eventId: input.eventId },
		null,
		true,
		input.answerId,
	);
	return {
		...form,
		respondent: {
			id: answer.id,
			displayName: answer.respondentName ?? "",
			isGuest: true,
		},
	};
}

export async function getNewGuestAnswerForm(
	eventId: ManageGuestAnswerRequest["eventId"],
	ownerUserId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	await requireEventOwner({ eventId }, ownerUserId);
	return getAnswerForm({ eventId }, null, true);
}

export async function saveGuestAnswer(
	input: SaveGuestAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<SaveOffkaiAnswerResponse>> {
	await requireEventOwner(input, ownerUserId);
	if (!input.respondentName.trim())
		throw new AppError("VALIDATION_ERROR", "ゲストの名前を入力してください。");
	const answer = await new OffkaiAnswerService().prepareGuestAnswerEntity(
		input.eventId,
		input.respondentName,
		input.commitmentAnswers,
		input.preferenceAnswers,
		input.bringingKigurumis,
		input.answerId,
	);
	await new OffkaiAnswerRepository().save(answer, ownerUserId);
	return { ok: true };
}

export async function deleteGuestAnswer(
	input: ManageGuestAnswerRequest,
	ownerUserId: UserId,
): Promise<void> {
	await requireEventOwner(input, ownerUserId);
	const repository = new OffkaiAnswerRepository();
	const answer = await repository.findById(input.answerId);
	if (!answer || answer.eventId !== input.eventId || answer.userId !== null)
		throw new AppError(
			"ANSWER_NOT_FOUND",
			"削除対象のゲスト回答が見つかりません。",
		);
	if (await repository.hasFinancialData(input.answerId))
		throw new AppError(
			"VALIDATION_ERROR",
			"会計データがあるゲストは削除できません。",
		);
	await repository.delete(input.answerId);
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
	input: { eventId: ManageOffkaiAnswerRequest["eventId"] },
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
