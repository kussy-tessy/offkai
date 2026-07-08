import {
	type CreatePhotoShareRequest,
	type CreatePhotoShareResponse,
	type GetPhotoSharesResponse,
	PhotoShare,
	type PhotoShareItemRouteParams,
	type PhotoShareRouteParams,
	type Unbrand,
	type UpdatePhotoDownloadStatusRequest,
	type UpdatePhotoDownloadStatusResponse,
	type UpdatePhotoShareRequest,
	type UpdatePhotoShareResponse,
	type UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { PhotoShareRepository } from "../../../repository";

export async function getPhotoShares(
	input: PhotoShareRouteParams,
	userId: UserId,
): Promise<Unbrand<GetPhotoSharesResponse>> {
	const repository = new PhotoShareRepository();
	await requireAnswer(repository, input.eventId, userId);
	const page = await repository.getPage(input.eventId, userId);
	if (!page) throw photoShareNotFound();
	return page;
}

export async function createPhotoShare(
	input: CreatePhotoShareRequest,
	userId: UserId,
): Promise<Unbrand<CreatePhotoShareResponse>> {
	const repository = new PhotoShareRepository();
	await requireAnswer(repository, input.eventId, userId);

	const photoShare = PhotoShare.create({
		eventId: input.eventId,
		uploaderUserId: userId,
		url: input.url,
		metadata: toMetadata(input),
	});
	await repository.save(photoShare);
	return requirePhotoShareView(repository, photoShare, userId);
}

export async function updatePhotoShare(
	input: UpdatePhotoShareRequest,
	userId: UserId,
): Promise<Unbrand<UpdatePhotoShareResponse>> {
	const repository = new PhotoShareRepository();
	await requireAnswer(repository, input.eventId, userId);
	const photoShare = await requirePhotoShare(repository, input);
	requireUploader(photoShare, userId);

	const edited = photoShare.edit(toMetadata(input));
	await repository.save(edited);
	return requirePhotoShareView(repository, edited, userId);
}

export async function deletePhotoShare(
	input: PhotoShareItemRouteParams,
	userId: UserId,
): Promise<void> {
	const repository = new PhotoShareRepository();
	await requireAnswer(repository, input.eventId, userId);
	const photoShare = await requirePhotoShare(repository, input);
	requireUploader(photoShare, userId);
	await repository.delete(photoShare.id);
}

export async function updatePhotoDownloadStatus(
	input: UpdatePhotoDownloadStatusRequest,
	userId: UserId,
): Promise<Unbrand<UpdatePhotoDownloadStatusResponse>> {
	const repository = new PhotoShareRepository();
	await requireAnswer(repository, input.eventId, userId);
	const photoShare = await requirePhotoShare(repository, input);
	await repository.setDownloaded(photoShare.id, userId, input.downloaded);
	return { ok: true };
}

async function requireAnswer(
	repository: PhotoShareRepository,
	eventId: PhotoShareRouteParams["eventId"],
	userId: UserId,
) {
	if (!(await repository.hasAnswer(eventId, userId))) {
		throw new AppError(
			"FORBIDDEN",
			"写真共有を利用するには、このオフ会への回答が必要です。",
		);
	}
}

async function requirePhotoShare(
	repository: PhotoShareRepository,
	input: PhotoShareItemRouteParams,
) {
	const photoShare = await repository.findById(
		input.eventId,
		input.photoShareId,
	);
	if (!photoShare) throw photoShareNotFound();
	return photoShare;
}

async function requirePhotoShareView(
	repository: PhotoShareRepository,
	photoShare: PhotoShare,
	userId: UserId,
) {
	const view = await repository.findViewById(
		photoShare.eventId,
		photoShare.id,
		userId,
	);
	if (!view) throw photoShareNotFound();
	return view;
}

function requireUploader(photoShare: PhotoShare, userId: UserId) {
	if (!photoShare.isUploadedBy(userId)) {
		throw new AppError("FORBIDDEN", "他のユーザーの投稿は変更できません。");
	}
}

function toMetadata(input: {
	downloadDeadline: string | null;
	password: string | null;
	note: string | null;
}) {
	return {
		downloadDeadline: input.downloadDeadline,
		password: input.password,
		note: input.note,
	};
}

function photoShareNotFound() {
	return new AppError("PHOTO_SHARE_NOT_FOUND", "写真共有が見つかりません。");
}
