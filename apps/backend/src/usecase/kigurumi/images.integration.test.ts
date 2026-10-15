import { randomUUID } from "node:crypto";
import {
	KigurumiIdSchema,
	OffkaiEventIdSchema,
	UserIdSchema,
} from "@offkai/core";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../repository/prisma";
import { resolveBringingKigurumiImages } from "../../repository/kigurumi-images";
import {
	getKigurumiImage,
	uploadKigurumiImage,
	deleteKigurumiImage,
} from "./images";
vi.mock("../../service/guide-image-storage", () => ({
	putGuideImage: vi.fn(async () => {}),
	signGuideImage: vi.fn(async (key: string) => `https://example.test/${key}`),
}));

describe.runIf(process.env.KIGURUMI_IMAGE_DB_TEST === "1")(
	"着ぐるみ画像の保存・閲覧権限",
	() => {
		const owner = UserIdSchema.parse(randomUUID()),
			participant = UserIdSchema.parse(randomUUID()),
			outsider = UserIdSchema.parse(randomUUID());
		const seriesId = randomUUID(),
			eventId = OffkaiEventIdSchema.parse(randomUUID()),
			id = KigurumiIdSchema.parse(randomUUID());
		let bytes: Buffer;
		beforeAll(async () => {
			await prisma.user.createMany({
				data: [owner, participant, outsider].map((id) => ({
					id,
					name: "image test",
				})),
			});
			await prisma.passwordCredential.createMany({
				data: [owner, participant, outsider].map((userId) => ({
					userId,
					loginId: userId.replaceAll("-", ""),
					passwordHash: "test-only",
				})),
			});
			await prisma.series.create({
				data: {
					id: seriesId,
					name: "image test",
					members: { create: { userId: owner, role: "owner" } },
				},
			});
			await prisma.offkaiEvent.create({
				data: {
					id: eventId,
					seriesId,
					name: "image test",
					eventStartDate: new Date(),
					eventEndDate: new Date(),
					applicationStartDate: new Date(0),
					preferenceQuestions: [],
					askBringingKigurumi: true,
				},
			});
			await prisma.kigurumi.create({
				data: {
					id,
					ownerUserId: participant,
					title: "作品",
					character: "キャラ",
				},
			});
			await prisma.offkaiAnswer.create({
				data: {
					eventId,
					userId: participant,
					updatedBy: participant,
					respondentName: "参加者",
					preferenceAnswers: [],
					bringingKigurumis: [{ title: "作品", character: "キャラ" }],
				},
			});
			bytes = await sharp({
				create: { width: 20, height: 10, channels: 3, background: "blue" },
			})
				.png()
				.toBuffer();
		});
		afterAll(async () => {
			await prisma.offkaiAnswer.deleteMany({ where: { eventId } });
			await prisma.offkaiEvent.deleteMany({ where: { id: eventId } });
			await prisma.seriesMember.deleteMany({ where: { seriesId } });
			await prisma.series.deleteMany({ where: { id: seriesId } });
			await prisma.user.deleteMany({
				where: { id: { in: [owner, participant, outsider] } },
			});
			await prisma.r2PendingDeletion.deleteMany({
				where: { objectKey: { startsWith: `kigurumi/${id}/` } },
			});
			await prisma.$disconnect();
		});
		it("所有者だけが登録・削除できる", async () => {
			await expect(
				uploadKigurumiImage(id, outsider, bytes),
			).rejects.toMatchObject({ code: "FORBIDDEN" });
			await uploadKigurumiImage(id, participant, bytes);
			await expect(deleteKigurumiImage(id, owner)).rejects.toMatchObject({
				code: "FORBIDDEN",
			});
			await expect(getKigurumiImage(id, participant)).resolves.toMatchObject({
				width: 20,
				height: 10,
			});
		});
		it("未回答の主催者は閲覧でき、未回答の一般ユーザーは閲覧できない", async () => {
			await expect(getKigurumiImage(id, owner, eventId)).resolves.toMatchObject(
				{ width: 20 },
			);
			await expect(
				getKigurumiImage(id, outsider, eventId),
			).rejects.toMatchObject({ code: "FORBIDDEN" });
			await expect(getKigurumiImage(id, owner)).rejects.toMatchObject({
				code: "FORBIDDEN",
			});
		});
		it("既存回答に画像を関連づけ、他人の画像IDを除外する", async () => {
			const result = await resolveBringingKigurumiImages([
				{
					userId: participant,
					bringingKigurumis: [{ title: "作品", character: "キャラ" }],
				},
				{
					userId: outsider,
					bringingKigurumis: [
						{
							title: "作品",
							character: "キャラ",
							kigurumiId: id,
							hasImage: true,
						},
					],
				},
			]);
			expect(result[0][0]).toMatchObject({ kigurumiId: id, hasImage: true });
			expect(result[1][0].hasImage).toBeUndefined();
		});
		it("不正な画像は保存しない", async () => {
			await expect(
				uploadKigurumiImage(id, participant, Buffer.from("not an image")),
			).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
		});
		it("差し替えは1枚を維持して旧画像を削除キューへ入れる", async () => {
			const old = await prisma.kigurumiImage.findUniqueOrThrow({
				where: { kigurumiId: id },
			});
			await uploadKigurumiImage(id, participant, bytes);
			expect(
				await prisma.kigurumiImage.count({ where: { kigurumiId: id } }),
			).toBe(1);
			expect(
				await prisma.r2PendingDeletion.findUnique({
					where: { objectKey: old.objectKey },
				}),
			).not.toBeNull();
		});
		it("画像削除後は名前を残し、リンクを表示しない", async () => {
			await deleteKigurumiImage(id, participant);
			const result = await resolveBringingKigurumiImages([
				{
					userId: participant,
					bringingKigurumis: [
						{ title: "作品", character: "キャラ", kigurumiId: id },
					],
				},
			]);
			expect(result[0][0]).toMatchObject({
				character: "キャラ",
				hasImage: false,
			});
			await expect(getKigurumiImage(id, participant)).rejects.toMatchObject({
				code: "API_NOT_FOUND",
			});
		});
		it("登録削除時も画像を削除キューへ入れる", async () => {
			await uploadKigurumiImage(id, participant, bytes);
			const image = await prisma.kigurumiImage.findUniqueOrThrow({
				where: { kigurumiId: id },
			});
			await prisma.kigurumi.delete({ where: { id } });
			expect(
				await prisma.kigurumiImage.count({ where: { kigurumiId: id } }),
			).toBe(0);
			expect(
				await prisma.r2PendingDeletion.findUnique({
					where: { objectKey: image.objectKey },
				}),
			).not.toBeNull();
		});
	},
);
