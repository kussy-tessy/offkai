import {
	UpdateSeriesQuestionTemplateRequestSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { getQuestionTemplate } from "./get-question-template.usecase";
import { updateQuestionTemplate } from "./update-question-template.usecase";

export const seriesRoute: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.auth.requireUser);

	app.get("/my/question-template", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return getQuestionTemplate(userId);
	});

	app.put("/my/question-template", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = UpdateSeriesQuestionTemplateRequestSchema.parse(request.body);
		return updateQuestionTemplate(input, userId);
	});
};
