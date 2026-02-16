import {
	CreateOffkaiEventRequestSchema,
	GetOffkaiEventRequestSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { createOffkaiEvent } from "./create-offkai-event.usecase";
import { getOffkaiEvent } from "./get-offkai-event.usecase.schema";

export const offkaiEventRoute: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.auth.requireUser);

	// GET /offkai-event/:id
	app.get("/:id", async (request) => {
		const input = GetOffkaiEventRequestSchema.parse(request.params);
		return getOffkaiEvent(input);
	});

	// POST /offkai-event
	app.post("/", async (request) => {
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return createOffkaiEvent(input);
	});
};
