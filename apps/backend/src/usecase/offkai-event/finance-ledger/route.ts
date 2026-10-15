import { OffkaiEventIdSchema, UserIdSchema } from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { cleanGuideImages } from "../../../service/guide-image-storage";
import {
	deleteFinanceExpenseImage,
	FINANCE_EXPENSE_IMAGE_MAX_BYTES,
	listFinanceExpenseImages,
	uploadFinanceExpenseImage,
} from "./expense-images";
import {
	activateLedger,
	changeLedger,
	getLedger,
	getLedgerHistory,
} from "./ledger.service";
export const financeLedgerRoute: FastifyPluginAsync = async (app) => {
	const auth = { preHandler: app.auth.requireUser };
	app.addContentTypeParser(
		"application/octet-stream",
		{ parseAs: "buffer", bodyLimit: FINANCE_EXPENSE_IMAGE_MAX_BYTES },
		(_request, body, done) => done(null, body),
	);
	app.setErrorHandler((error, _request, reply) => {
		if (error.statusCode === 413)
			return reply.code(413).send({
				code: "VALIDATION_ERROR",
				message: "画像は1枚10MB以下にしてください。",
			});
		throw error;
	});
	const ids = (params: unknown, userId: unknown) => ({
		eventId: z.object({ eventId: OffkaiEventIdSchema }).parse(params).eventId,
		userId: UserIdSchema.parse(userId),
	});
	app.get("/:eventId/finance-ledger", auth, async (request) => {
		const p = ids(request.params, request.user.userId);
		return getLedger(p.eventId, p.userId);
	});
	app.get("/:eventId/finance-ledger/history", auth, async (request) => {
		const p = ids(request.params, request.user.userId);
		return getLedgerHistory(p.eventId, p.userId);
	});
	app.get(
		"/:eventId/finance-ledger/expenses/:expenseId/images",
		auth,
		async (request, reply) => {
			const p = z
				.object({
					eventId: OffkaiEventIdSchema,
					expenseId: z.string().min(1).max(100),
				})
				.parse(request.params);
			await requireEventPermission(
				p.eventId,
				UserIdSchema.parse(request.user.userId),
				{ area: "settlement", level: "read" },
			);
			reply.header("Cache-Control", "no-store");
			return listFinanceExpenseImages(p.eventId, p.expenseId);
		},
	);
	app.post(
		"/:eventId/finance-ledger/expenses/:expenseId/images/:imageId",
		{ ...auth, bodyLimit: FINANCE_EXPENSE_IMAGE_MAX_BYTES },
		async (request, reply) => {
			const p = z
				.object({
					eventId: OffkaiEventIdSchema,
					expenseId: z.string().min(1).max(100),
					imageId: z.string().uuid(),
				})
				.parse(request.params);
			const userId = UserIdSchema.parse(request.user.userId);
			await requireEventPermission(p.eventId, userId, {
				area: "settlement",
				level: "edit",
			});
			if (!Buffer.isBuffer(request.body))
				throw new AppError(
					"VALIDATION_ERROR",
					"画像ファイルを送信してください。",
				);
			const result = await uploadFinanceExpenseImage(
				p.eventId,
				p.expenseId,
				p.imageId,
				userId,
				request.body,
			);
			return reply.code(201).send(result);
		},
	);
	app.delete(
		"/:eventId/finance-ledger/expenses/:expenseId/images/:imageId",
		auth,
		async (request, reply) => {
			const p = z
				.object({
					eventId: OffkaiEventIdSchema,
					expenseId: z.string().min(1).max(100),
					imageId: z.string().uuid(),
				})
				.parse(request.params);
			await requireEventPermission(
				p.eventId,
				UserIdSchema.parse(request.user.userId),
				{ area: "settlement", level: "edit" },
			);
			await deleteFinanceExpenseImage(p.eventId, p.expenseId, p.imageId);
			void cleanGuideImages().catch(() =>
				console.warn("R2 cleanup will be retried"),
			);
			return reply.code(204).send();
		},
	);
	app.post("/:eventId/finance-ledger/activate", auth, async (request) => {
		const p = ids(request.params, request.user.userId);
		return activateLedger(
			p.eventId,
			p.userId,
			z.object({ fingerprint: z.string() }).parse(request.body).fingerprint,
		);
	});
	app.post("/:eventId/finance-ledger/commands", auth, async (request) => {
		const p = ids(request.params, request.user.userId);
		return changeLedger(p.eventId, p.userId, request.body);
	});
};
