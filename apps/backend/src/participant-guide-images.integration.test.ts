import { randomUUID } from "node:crypto";
import { OffkaiEventIdSchema, UserIdSchema } from "@offkai/core";
import Fastify, { type FastifyInstance } from "fastify";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppError, appErrorStatusCodes } from "./app-error";
import { prisma } from "./repository/prisma";
import { participantGuideImageRoute } from "./usecase/offkai-event/participant-guide/image-route";

const storage = vi.hoisted(() => ({
	put: vi.fn(async () => {}),
	sign: vi.fn(async (key: string) => `https://example.test/${key}?signed=1`),
}));
vi.mock("./service/guide-image-storage", () => ({
	putGuideImage: storage.put,
	signGuideImage: storage.sign,
	cleanGuideImages: vi.fn(async () => {}),
}));

// Explicit opt-in: uses only unique fixtures, cleaned in afterAll. R2 is mocked.
describe.runIf(process.env.GUIDE_IMAGE_DB_TEST === "1")(
	"participant guide image API + PostgreSQL",
	() => {
		const seriesId = randomUUID();
		const eventId = OffkaiEventIdSchema.parse(randomUUID());
		const owner = UserIdSchema.parse(randomUUID());
		const participant = UserIdSchema.parse(randomUUID());
		const outsider = UserIdSchema.parse(randomUUID());
		let app: FastifyInstance;
		let bytes: Buffer;
		const base = `/api/offkai-event/${eventId}/participant-guide/images`;
		const request = (
			method: "GET" | "POST" | "DELETE",
			path: string,
			user = owner,
			body?: Buffer,
		) =>
			app.inject({
				method,
				url: path,
				headers: {
					"x-test-user": user,
					"content-type": "application/octet-stream",
				},
				payload: body,
			});
		beforeAll(async () => {
			await prisma.user.createMany({
				data: [owner, participant, outsider].map((id) => ({
					id,
					name: "guide image test",
				})),
			});
			await prisma.series.create({
				data: {
					id: seriesId,
					name: "guide image test",
					members: { create: { userId: owner, role: "owner" } },
				},
			});
			await prisma.offkaiEvent.create({
				data: {
					id: eventId,
					seriesId,
					name: "guide image test",
					eventStartDate: new Date("2026-11-01"),
					eventEndDate: new Date("2026-11-01"),
					applicationStartDate: new Date("2026-10-01"),
					preferenceQuestions: [],
				},
			});
			await prisma.offkaiAnswer.create({
				data: {
					eventId,
					userId: participant,
					respondentName: "participant",
					updatedBy: participant,
					preferenceAnswers: [],
				},
			});
			bytes = await sharp({
				create: { width: 20, height: 10, channels: 3, background: "blue" },
			})
				.png()
				.toBuffer();
			app = Fastify();
			app.decorate("auth", {
				requireUser: async (req: {
					headers: Record<string, unknown>;
					user: unknown;
				}) => {
					const id = req.headers["x-test-user"];
					if (!id) throw new AppError("UNAUTHORIZED", "ログインしてください。");
					req.user = { userId: id };
				},
			} as never);
			app.setErrorHandler((error, _req, reply) => {
				if (error instanceof AppError)
					return reply
						.code(appErrorStatusCodes[error.code])
						.send({ message: error.message });
				return reply.code(500).send({ message: error.message });
			});
			await app.register(participantGuideImageRoute, {
				prefix: "/api/offkai-event",
			});
			await app.ready();
		});
		afterAll(async () => {
			await app?.close();
			await prisma.offkaiAnswer.deleteMany({ where: { eventId } });
			await prisma.offkaiEvent.deleteMany({ where: { id: eventId } });
			await prisma.r2PendingDeletion.deleteMany({
				where: { objectKey: { startsWith: `participant-guide/${eventId}/` } },
			});
			await prisma.seriesMember.deleteMany({ where: { seriesId } });
			await prisma.series.deleteMany({ where: { id: seriesId } });
			await prisma.user.deleteMany({
				where: { id: { in: [owner, participant, outsider] } },
			});
			await prisma.$disconnect();
		});
		it("enforces authentication, viewing and editing permissions before uploads", async () => {
			expect((await app.inject({ method: "GET", url: base })).statusCode).toBe(
				401,
			);
			expect((await request("GET", base, outsider)).statusCode).toBe(403);
			expect((await request("GET", base, participant)).statusCode).toBe(200);
			expect(
				(await request("POST", `${base}/${randomUUID()}`, participant, bytes))
					.statusCode,
			).toBe(403);
			expect(
				(await request("DELETE", `${base}/${randomUUID()}`, participant))
					.statusCode,
			).toBe(403);
			expect(storage.put).not.toHaveBeenCalled();
		});
		it("rejects invalid files and enforces the 10MB body limit", async () => {
			expect(
				(
					await request(
						"POST",
						`${base}/${randomUUID()}`,
						owner,
						Buffer.from("invalid"),
					)
				).statusCode,
			).toBe(400);
			expect(
				(
					await request(
						"POST",
						`${base}/${randomUUID()}`,
						owner,
						Buffer.alloc(10 * 1024 * 1024 + 1),
					)
				).statusCode,
			).toBe(413);
		});
		it("supports multiple images, idempotent retries, scoped URLs and durable deletion", async () => {
			const firstId = randomUUID();
			for (const id of [firstId, randomUUID()])
				expect(
					(await request("POST", `${base}/${id}`, owner, bytes)).statusCode,
				).toBe(201);
			expect(
				(await request("POST", `${base}/${firstId}`, owner, bytes)).statusCode,
			).toBe(201);
			const listed = await request("GET", base, participant);
			expect(listed.headers["cache-control"]).toBe("no-store");
			expect(listed.json()).toHaveLength(2);
			expect(listed.json()[0]).toMatchObject({ width: 20, height: 10 });
			expect(
				(await request("GET", `${base}/${firstId}`, outsider)).statusCode,
			).toBe(403);
			expect(
				(await request("GET", `${base}/${randomUUID()}`, participant))
					.statusCode,
			).toBe(404);
			const row = await prisma.participantGuideImage.findUniqueOrThrow({
				where: { id: firstId },
			});
			expect((await request("DELETE", `${base}/${firstId}`)).statusCode).toBe(
				204,
			);
			expect(
				await prisma.r2PendingDeletion.findUnique({
					where: { objectKey: row.objectKey },
				}),
			).not.toBeNull();
			expect(
				(await request("GET", `${base}/${firstId}`, participant)).statusCode,
			).toBe(404);
		});
		it("keeps a cleanup reservation when storage fails", async () => {
			storage.put.mockRejectedValueOnce(new Error("storage unavailable"));
			const before = await prisma.r2PendingDeletion.count({
				where: { objectKey: { startsWith: `participant-guide/${eventId}/` } },
			});
			expect(
				(await request("POST", `${base}/${randomUUID()}`, owner, bytes))
					.statusCode,
			).toBe(500);
			expect(
				await prisma.r2PendingDeletion.count({
					where: { objectKey: { startsWith: `participant-guide/${eventId}/` } },
				}),
			).toBe(before + 1);
		});
		it("serializes concurrent uploads at the event limit and queues cascade deletions", async () => {
			const current = await prisma.participantGuideImage.count({
				where: { eventId },
			});
			await prisma.participantGuideImage.createMany({
				data: Array.from({ length: 19 - current }, () => ({
					id: randomUUID(),
					eventId,
					uploaderUserId: owner,
					objectKey: `participant-guide/${eventId}/${randomUUID()}.webp`,
					sha256: "test",
					width: 1,
					height: 1,
				})),
			});
			const responses = await Promise.all([
				request("POST", `${base}/${randomUUID()}`, owner, bytes),
				request("POST", `${base}/${randomUUID()}`, owner, bytes),
			]);
			expect(responses.map((r) => r.statusCode).sort()).toEqual([201, 409]);
			expect(
				await prisma.participantGuideImage.count({ where: { eventId } }),
			).toBe(20);
			const rows = await prisma.participantGuideImage.findMany({
				where: { eventId },
			});
			await prisma.offkaiAnswer.deleteMany({ where: { eventId } });
			await prisma.offkaiEvent.delete({ where: { id: eventId } });
			expect(
				await prisma.r2PendingDeletion.count({
					where: { objectKey: { in: rows.map((r) => r.objectKey) } },
				}),
			).toBe(20);
		});
	},
);
