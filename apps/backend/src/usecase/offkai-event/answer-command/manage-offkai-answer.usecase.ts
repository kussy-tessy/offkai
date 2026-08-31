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
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { OffkaiAnswerRepository } from "../../../repository";
import { OffkaiAnswerService } from "../../../service/offkai-answer.service";
import { getAnswerForm } from "./get-my-answer-form.usecase";

export async function getManagedOffkaiAnswerForm(
	input: ManageOffkaiAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
	await requireAnswerPermission(input.eventId, ownerUserId, "edit");

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
	await requireAnswerPermission(input.eventId, ownerUserId, "edit");
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
	await requireAnswerPermission(eventId, ownerUserId, "edit");
	return getAnswerForm({ eventId }, null, true);
}

export async function saveGuestAnswer(
	input: SaveGuestAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<SaveOffkaiAnswerResponse>> {
	await requireAnswerPermission(input.eventId, ownerUserId, "edit");
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
	await requireAnswerPermission(input.eventId, ownerUserId, "delete");
	const repository = new OffkaiAnswerRepository();
	const answer = await repository.findById(input.answerId);
	if (!answer || answer.eventId !== input.eventId || answer.userId !== null)
		throw new AppError(
			"ANSWER_NOT_FOUND",
			"削除対象のゲスト回答が見つかりません。",
		);
	if (await repository.isCollectionStarted(input.eventId))
		throw new AppError(
			"VALIDATION_ERROR",
			"参加費の徴収開始後は回答を削除できません。",
		);
	await repository.delete(input.answerId);
}

export async function deleteManagedOffkaiAnswer(
	input: ManageOffkaiAnswerRequest,
	viewerUserId: UserId,
): Promise<void> {
	await requireAnswerPermission(input.eventId, viewerUserId, "delete");
	const repository = new OffkaiAnswerRepository();
	const answer = await repository.findByEventAndUser(input.eventId, input.userId);
	if (!answer) throw new AppError("ANSWER_NOT_FOUND", "削除対象の回答が見つかりません。");
	if (await repository.isCollectionStarted(input.eventId)) {
		throw new AppError("VALIDATION_ERROR", "参加費の徴収開始後は回答を削除できません。");
	}
	await repository.delete(answer.id);
}

export async function saveManagedOffkaiAnswer(
	params: ManageOffkaiAnswerRequest,
	input: SaveOffkaiAnswerRequest,
	ownerUserId: UserId,
): Promise<Unbrand<SaveOffkaiAnswerResponse>> {
	await requireAnswerPermission(params.eventId, ownerUserId, "edit");

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

async function requireAnswerPermission(
	eventId: ManageOffkaiAnswerRequest["eventId"],
	viewerUserId: UserId,
	level: "edit" | "delete",
) {
	await requireEventPermission(eventId, viewerUserId, { area: "answerManagement", level });
}
