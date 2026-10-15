import { createHash, randomUUID } from "node:crypto";
import {
	GUIDE_IMAGE_MAX_BYTES,
	FINANCE_EXPENSE_IMAGE_MAX_COUNT,
	type OffkaiEventId,
	type UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { prisma } from "../../../repository/prisma";
import { normalizeGuideImage } from "../../../service/normalize-guide-image";
import {
	putGuideImage,
	signGuideImage,
} from "../../../service/guide-image-storage";

export async function listFinanceExpenseImages(
	eventId: OffkaiEventId,
	expenseId: string,
) {
	const rows = await prisma.financeExpenseImage.findMany({
		where: { eventId, expenseId },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});
	return Promise.all(
		rows.map(async (image) => ({
			id: image.id,
			width: image.width,
			height: image.height,
			url: await signGuideImage(image.objectKey),
		})),
	);
}

export async function uploadFinanceExpenseImage(
	eventId: OffkaiEventId,
	expenseId: string,
	imageId: string,
	userId: UserId,
	body: Buffer,
) {
	const sha256 = createHash("sha256").update(body).digest("hex");
	const existing = await prisma.financeExpenseImage.findUnique({
		where: { id: imageId },
	});
	if (existing) {
		if (
			existing.eventId !== eventId ||
			existing.expenseId !== expenseId ||
			existing.uploaderUserId !== userId ||
			existing.sha256 !== sha256
		)
			throw new AppError("CONFLICT", "画像の送信IDが重複しています。");
		return { id: existing.id };
	}
	const expense = await prisma.financeExpense.findUnique({
		where: { eventId_id: { eventId, id: expenseId } },
		select: { id: true },
	});
	if (!expense) throw new AppError("API_NOT_FOUND", "支出が見つかりません。");
	const { data, info } = await normalizeGuideImage(body);
	const objectKey = `finance-expense/${eventId}/${expenseId}/${randomUUID()}.webp`;
	await prisma.r2PendingDeletion.create({
		data: { objectKey, notBefore: new Date(Date.now() + 3600_000) },
	});
	await putGuideImage(objectKey, data);
	return prisma.$transaction(async (tx) => {
		const locked = await tx.$queryRaw<Array<{ id: string }>>`
			SELECT "id" FROM "FinanceExpense"
			WHERE "eventId" = ${eventId} AND "id" = ${expenseId}
			FOR UPDATE`;
		if (!locked.length)
			throw new AppError("API_NOT_FOUND", "支出が見つかりません。");
		const duplicate = await tx.financeExpenseImage.findUnique({
			where: { id: imageId },
		});
		if (duplicate) {
			if (
				duplicate.eventId !== eventId ||
				duplicate.expenseId !== expenseId ||
				duplicate.uploaderUserId !== userId ||
				duplicate.sha256 !== sha256
			)
				throw new AppError("CONFLICT", "画像の送信IDが重複しています。");
			return { id: duplicate.id };
		}
		if (
			(await tx.financeExpenseImage.count({ where: { eventId, expenseId } })) >=
			FINANCE_EXPENSE_IMAGE_MAX_COUNT
		)
			throw new AppError(
				"CONFLICT",
				"1件の支出に添付できる画像は3枚までです。",
			);
		await tx.financeExpenseImage.create({
			data: {
				id: imageId,
				eventId,
				expenseId,
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

export async function deleteFinanceExpenseImage(
	eventId: OffkaiEventId,
	expenseId: string,
	imageId: string,
) {
	await prisma.financeExpenseImage.deleteMany({
		where: { eventId, expenseId, id: imageId },
	});
}

export const FINANCE_EXPENSE_IMAGE_MAX_BYTES = GUIDE_IMAGE_MAX_BYTES;
