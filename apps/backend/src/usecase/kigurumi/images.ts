import { randomUUID } from "node:crypto";
import type { KigurumiId, OffkaiEventId, UserId } from "@offkai/core";
import { AppError } from "../../app-error";
import { prisma } from "../../repository/prisma";
import { normalizeGuideImage } from "../../service/normalize-guide-image";
import {
	putGuideImage,
	signGuideImage,
} from "../../service/guide-image-storage";
import { getOffkaiDetail } from "../offkai-event/detail-query";

export async function requireKigurumiOwner(id: KigurumiId, userId: UserId) {
	const record = await prisma.kigurumi.findUnique({ where: { id } });
	if (!record)
		throw new AppError("KIGURUMI_NOT_FOUND", "着ぐるみさんが見つかりません。");
	if (record.ownerUserId !== userId)
		throw new AppError("FORBIDDEN", "この画像を変更する権限がありません。");
	return record;
}

export async function getKigurumiImage(
	id: KigurumiId,
	userId: UserId,
	eventId?: OffkaiEventId,
) {
	const record = await prisma.kigurumi.findUnique({
		where: { id },
		include: { image: true },
	});
	if (!record)
		throw new AppError("KIGURUMI_NOT_FOUND", "着ぐるみさんが見つかりません。");
	if (record.ownerUserId !== userId) {
		if (!eventId)
			throw new AppError("FORBIDDEN", "画像を閲覧する権限がありません。");
		const detail = await getOffkaiDetail({ eventId }, userId);
		const visible =
			detail.viewer.permissions.canViewPrivateAnswers &&
			detail.answers?.some((answer) =>
				answer.bringingKigurumis?.some(
					(item) => item.kigurumiId === id && item.hasImage,
				),
			);
		if (!visible)
			throw new AppError("FORBIDDEN", "画像を閲覧する権限がありません。");
	}
	if (!record.image)
		throw new AppError("API_NOT_FOUND", "画像は登録されていません。");
	return {
		url: await signGuideImage(record.image.objectKey),
		width: record.image.width,
		height: record.image.height,
	};
}

export async function uploadKigurumiImage(
	id: KigurumiId,
	userId: UserId,
	body: Buffer,
) {
	await requireKigurumiOwner(id, userId);
	const { data, info } = await normalizeGuideImage(body);
	const objectKey = `kigurumi/${id}/${randomUUID()}.webp`;
	await prisma.r2PendingDeletion.create({
		data: { objectKey, notBefore: new Date(Date.now() + 3600_000) },
	});
	await putGuideImage(objectKey, data);
	await prisma.$transaction(async (tx) => {
		const locked = await tx.$queryRaw<
			Array<{ id: string }>
		>`SELECT id FROM "Kigurumi" WHERE id = ${id} AND "ownerUserId" = ${userId} FOR UPDATE`;
		if (!locked.length)
			throw new AppError(
				"KIGURUMI_NOT_FOUND",
				"着ぐるみさんが見つかりません。",
			);
		const image = { objectKey, width: info.width, height: info.height };
		await tx.kigurumiImage.upsert({
			where: { kigurumiId: id },
			create: { kigurumiId: id, ...image },
			update: image,
		});
		await tx.r2PendingDeletion.delete({ where: { objectKey } });
	});
	return { ok: true };
}

export async function deleteKigurumiImage(id: KigurumiId, userId: UserId) {
	await requireKigurumiOwner(id, userId);
	await prisma.kigurumiImage.deleteMany({ where: { kigurumiId: id } });
}
