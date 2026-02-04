import type { FastifyPluginAsync } from "fastify";

import { createOffkaiEvent } from "./create-offkai-event.usecase";
import { getOffkaiEvent } from "./get-offkai-event.usecase.schema";
import { CreateOffkaiEventRequestSchema, GetOffkaiEventRequestSchema } from "packages/core/dist";

export const offkaiEventRoute: FastifyPluginAsync = async (app) => {
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
