import {
	CreateKigurumiRequestSchema,
	KigurumiRouteParamsSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import {
	createKigurumi,
	deleteKigurumi,
	getMyKigurumis,
} from "./kigurumi.usecase";

export const kigurumiRoute: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.auth.requireUser);

	app.get("/", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return getMyKigurumis(userId);
	});

	app.post("/", async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = CreateKigurumiRequestSchema.parse(request.body);
		const created = await createKigurumi(input, userId);
		return reply.code(201).send(created);
	});

	app.delete("/:kigurumiId", async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = KigurumiRouteParamsSchema.parse(request.params);
		await deleteKigurumi(input, userId);
		return reply.code(204).send();
	});
};
