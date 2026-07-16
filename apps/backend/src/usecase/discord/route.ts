import { UserIdSchema } from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { listDiscordRoles } from "./list-discord-roles.usecase";

export const discordRoute: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.auth.requireUser);

	app.get("/roles", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return listDiscordRoles(userId);
	});
};
