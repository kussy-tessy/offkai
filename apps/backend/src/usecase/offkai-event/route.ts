import {
	CreatePhotoShareRequestSchema,
	PhotoShareItemRouteParamsSchema,
	PhotoShareRouteParamsSchema,
	UpdatePhotoDownloadStatusRequestSchema,
	UpdatePhotoShareRequestSchema,
	CreateOffkaiEventRequestSchema,
	GetMyAnswerFormRequestSchema,
	GetOffkaiDetailRequestSchema,
	GetOffkaiEventRequestSchema,
	ManageOffkaiAnswerRequestSchema,
	SaveOffkaiAnswerRequestSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { getMyAnswerForm } from "./answer-command/get-my-answer-form.usecase";
import {
	getManagedOffkaiAnswerForm,
	saveManagedOffkaiAnswer,
} from "./answer-command/manage-offkai-answer.usecase";
import { saveOffkaiAnswer } from "./answer-command/save-offkai-answer.usecase";
import { getOffkaiDetail } from "./detail-query/get-offkai-detail.usecase";
import { createOffkaiEvent } from "./event-management/create-offkai-event.usecase";
import { deleteOffkaiEvent } from "./event-management/delete-offkai-event.usecase";
import { getMyOffkaiEvents } from "./event-management/get-my-offkai-events.usecase";
import { getOffkaiEvent } from "./event-management/get-offkai-event.usecase";
import { updateOffkaiEvent } from "./event-management/update-offkai-event.usecase";
import {
	createPhotoShare,
	deletePhotoShare,
	getPhotoShares,
	updatePhotoDownloadStatus,
	updatePhotoShare,
} from "./photo-sharing";

export const offkaiEventRoute: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.auth.requireUser);

	app.get("/:eventId/photo-shares", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = PhotoShareRouteParamsSchema.parse(request.params);
		return getPhotoShares(input, userId);
	});

	app.post("/:eventId/photo-shares", async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = CreatePhotoShareRequestSchema.parse({ ...body, ...params });
		const created = await createPhotoShare(input, userId);
		return reply.code(201).send(created);
	});

	app.put("/:eventId/photo-shares/:photoShareId", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = UpdatePhotoShareRequestSchema.parse({ ...body, ...params });
		return updatePhotoShare(input, userId);
	});

	app.delete(
		"/:eventId/photo-shares/:photoShareId",
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const input = PhotoShareItemRouteParamsSchema.parse(request.params);
			await deletePhotoShare(input, userId);
			return reply.code(204).send();
		},
	);

	app.put(
		"/:eventId/photo-shares/:photoShareId/download-status",
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const params = request.params as Record<string, unknown>;
			const body = request.body as Record<string, unknown>;
			const input = UpdatePhotoDownloadStatusRequestSchema.parse({
				...body,
				...params,
			});
			return updatePhotoDownloadStatus(input, userId);
		},
	);

	app.get("/my", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return getMyOffkaiEvents(userId);
	});

	app.get("/:id", async (request) => {
		const input = GetOffkaiEventRequestSchema.parse(request.params);
		return getOffkaiEvent(input);
	});

	app.get("/:eventId/my-answer-form", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetMyAnswerFormRequestSchema.parse(request.params);
		return getMyAnswerForm(input, userId);
	});

	app.get("/:eventId/answers/:userId/form", async (request) => {
		const ownerUserId = UserIdSchema.parse(request.user.userId);
		const input = ManageOffkaiAnswerRequestSchema.parse(request.params);
		return getManagedOffkaiAnswerForm(input, ownerUserId);
	});

	app.get("/:eventId/detail", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetOffkaiDetailRequestSchema.parse(request.params);
		return getOffkaiDetail(input, userId);
	});

	app.post("/", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return createOffkaiEvent(input, userId);
	});

	app.put("/:id", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = GetOffkaiEventRequestSchema.parse(request.params);
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return updateOffkaiEvent(params, input, userId);
	});

	app.delete("/:id", async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = GetOffkaiEventRequestSchema.parse(request.params);
		await deleteOffkaiEvent(params, userId);
		return reply.code(204).send();
	});

	app.put("/:eventId/answers/:userId", async (request) => {
		const ownerUserId = UserIdSchema.parse(request.user.userId);
		const params = ManageOffkaiAnswerRequestSchema.parse(request.params);
		const body = request.body as Record<string, unknown>;
		const input = SaveOffkaiAnswerRequestSchema.parse({
			...body,
			eventId: params.eventId,
		});
		return saveManagedOffkaiAnswer(params, input, ownerUserId);
	});

	app.put("/:eventId/answers", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = SaveOffkaiAnswerRequestSchema.parse({
			...body,
			eventId: params.eventId,
		});
		return saveOffkaiAnswer(input, userId);
	});
};
