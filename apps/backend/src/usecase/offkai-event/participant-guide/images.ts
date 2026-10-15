import { createHash, randomUUID } from "node:crypto";
import {
	effectiveChargeAmount,
	GUIDE_IMAGE_MAX_COUNT,
	type OffkaiEventId,
	type UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { withLedgerTransaction } from "../../../repository/finance-ledger/repository";
import { prisma } from "../../../repository/prisma";
import {
	putGuideImage,
	signGuideImage,
} from "../../../service/guide-image-storage";
import { normalizeGuideImage } from "../../../service/normalize-guide-image";
import { buildLegacyLedger } from "../finance-ledger/ledger.legacy";
import { syncFinanceSources } from "../finance-ledger/ledger.sources";

export async function getMyGuideFee(eventId: OffkaiEventId, userId: UserId) {
	return withLedgerTransaction(async (repository) => {
		const [record, legacy, sources] = await Promise.all([
			repository.read(eventId),
			repository.legacy(eventId),
			repository.sources(eventId),
		]);
		const ledger = record?.state ?? buildLegacyLedger(legacy);
		syncFinanceSources(ledger, sources);
		const amount = ledger.charges
			.filter((charge) => charge.personId === userId)
			.reduce(
				(total, charge) => total + effectiveChargeAmount(ledger, charge),
				0,
			);
		return { amount };
	});
}

export async function listGuideImages(eventId: OffkaiEventId) {
	const images = await prisma.participantGuideImage.findMany({
		where: { eventId },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});
	return Promise.all(
		images.map(async (image) => ({
			id: image.id,
			width: image.width,
			height: image.height,
			url: await signGuideImage(image.objectKey),
		})),
	);
}

export async function getGuideImageUrl(
	eventId: OffkaiEventId,
	imageId: string,
) {
	const image = await prisma.participantGuideImage.findFirst({
		where: { eventId, id: imageId },
	});
	if (!image) throw new AppError("API_NOT_FOUND", "画像が見つかりません。");
	return {
		id: image.id,
		width: image.width,
		height: image.height,
		url: await signGuideImage(image.objectKey),
	};
}

export async function uploadGuideImage(
	eventId: OffkaiEventId,
	imageId: string,
	userId: UserId,
	body: Buffer,
) {
	const sha256 = createHash("sha256").update(body).digest("hex");
	const existing = await prisma.participantGuideImage.findUnique({
		where: { id: imageId },
	});
	if (existing) {
		if (
			existing.eventId !== eventId ||
			existing.uploaderUserId !== userId ||
			existing.sha256 !== sha256
		)
			throw new AppError("CONFLICT", "画像の送信IDが重複しています。");
		return { id: existing.id };
	}
	if (
		(await prisma.participantGuideImage.count({ where: { eventId } })) >=
		GUIDE_IMAGE_MAX_COUNT
	)
		throw new AppError("CONFLICT", "画像は1イベント20枚までです。");
	const { data, info } = await normalizeGuideImage(body);
	const objectKey = `participant-guide/${eventId}/${randomUUID()}.webp`;
	// Reserve cleanup before touching R2, so failed requests or crashes cannot orphan uploads.
	await prisma.r2PendingDeletion.create({
		data: { objectKey, notBefore: new Date(Date.now() + 3600_000) },
	});
	await putGuideImage(objectKey, data);
	return prisma.$transaction(async (tx) => {
		// Serialize image additions per event, including concurrent requests at the 20-image limit.
		const events = await tx.$queryRaw<
			Array<{ id: string }>
		>`SELECT id FROM "OffkaiEvent" WHERE id = ${eventId} FOR UPDATE`;
		if (!events.length)
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		const duplicate = await tx.participantGuideImage.findUnique({
			where: { id: imageId },
		});
		if (duplicate) {
			if (
				duplicate.eventId !== eventId ||
				duplicate.uploaderUserId !== userId ||
				duplicate.sha256 !== sha256
			)
				throw new AppError("CONFLICT", "画像の送信IDが重複しています。");
			return { id: duplicate.id }; // The redundant object remains queued for cleanup.
		}
		if (
			(await tx.participantGuideImage.count({ where: { eventId } })) >=
			GUIDE_IMAGE_MAX_COUNT
		)
			throw new AppError("CONFLICT", "画像は1イベント20枚までです。");
		await tx.participantGuideImage.create({
			data: {
				id: imageId,
				eventId,
				uploaderUserId: userId,
				objectKey,
				sha256,
				width: info.width,
				height: info.height,
			},
		});
		await tx.r2PendingDeletion.delete({ where: { objectKey } });
		return { id: imageId };
	});
}

export async function deleteGuideImage(
	eventId: OffkaiEventId,
	imageId: string,
) {
	// The database trigger durably queues R2 deletion, including cascading event deletion.
	await prisma.participantGuideImage.deleteMany({
		where: { eventId, id: imageId },
	});
}
