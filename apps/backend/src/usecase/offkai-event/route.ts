import {
	CreateOffkaiEventRequestSchema,
	GetMyAnswerFormRequestSchema,
	GetOffkaiDetailRequestSchema,
	GetOffkaiEventRequestSchema,
	SaveOffkaiAnswerRequestSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { getMyAnswerForm } from "./answer-command/get-my-answer-form.usecase";
import { saveOffkaiAnswer } from "./answer-command/save-offkai-answer.usecase";
import { getOffkaiDetail } from "./detail-query/get-offkai-detail.usecase";
import { createOffkaiEvent } from "./event-management/create-offkai-event.usecase";
import { deleteOffkaiEvent } from "./event-management/delete-offkai-event.usecase";
import { getMyOffkaiEvents } from "./event-management/get-my-offkai-events.usecase";
import { getOffkaiEvent } from "./event-management/get-offkai-event.usecase";
import { updateOffkaiEvent } from "./event-management/update-offkai-event.usecase";

export const offkaiEventRoute: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.auth.requireUser);

	// GET /offkai-event/my
	app.get("/my", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return getMyOffkaiEvents(userId);
	});

	// GET /offkai-event/:id
	app.get("/:id", async (request) => {
		const input = GetOffkaiEventRequestSchema.parse(request.params);
		return getOffkaiEvent(input);
	});

	// GET /offkai-event/:eventId/my-answer-form
	app.get("/:eventId/my-answer-form", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetMyAnswerFormRequestSchema.parse(request.params);
		return getMyAnswerForm(input, userId);
	});

	// GET /offkai-event/:eventId/detail
	app.get("/:eventId/detail", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetOffkaiDetailRequestSchema.parse(request.params);
		return getOffkaiDetail(input, userId);
	});

	// POST /offkai-event
	app.post("/", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return createOffkaiEvent(input, userId);
	});

	// PUT /offkai-event/:id
	app.put("/:id", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = GetOffkaiEventRequestSchema.parse(request.params);
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return updateOffkaiEvent(params, input, userId);
	});

	// DELETE /offkai-event/:id
	app.delete("/:id", async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = GetOffkaiEventRequestSchema.parse(request.params);
		await deleteOffkaiEvent(params, userId);
		return reply.code(204).send();
	});

	// PUT /offkai-event/:eventId/answers
	app.put("/:eventId/answers", async (request) => {
		const rawUserId = request.user.userId;
		const userId = UserIdSchema.parse(rawUserId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = SaveOffkaiAnswerRequestSchema.parse({
			...body,
			eventId: params.eventId,
		});
		return saveOffkaiAnswer(input, userId);
	});
};
