import {
	UpdateSeriesQuestionTemplateRequestSchema,
	UpdateSeriesSettingsRequestSchema,
	UpdateStaffPermissionsRequestSchema,
	AddSeriesStaffRequestSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { getQuestionTemplate } from "./get-question-template.usecase";
import { updateQuestionTemplate } from "./update-question-template.usecase";
import { getSeriesSettings } from "./get-series-settings.usecase";
import { updateSeriesSettings } from "./update-series-settings.usecase";
import { getStaffPermissions } from "./get-staff-permissions.usecase";
import { updateStaffPermissions } from "./update-staff-permissions.usecase";
import {
	addSeriesStaff,
	getSeriesStaff,
	removeSeriesStaff,
} from "./staff-management.usecase";

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

	app.get("/my/settings", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return getSeriesSettings(userId);
	});

	app.put("/my/settings", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = UpdateSeriesSettingsRequestSchema.parse(request.body);
		return updateSeriesSettings(input, userId);
	});

	app.get("/my/staff-permissions", async (request) => {
		return getStaffPermissions(UserIdSchema.parse(request.user.userId));
	});

	app.put("/my/staff-permissions", async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return updateStaffPermissions(
			UpdateStaffPermissionsRequestSchema.parse(request.body),
			userId,
		);
	});

	app.get("/my/staff", async (request) => {
		return getSeriesStaff(UserIdSchema.parse(request.user.userId));
	});

	app.post("/my/staff", async (request) => {
		return addSeriesStaff(
			AddSeriesStaffRequestSchema.parse(request.body),
			UserIdSchema.parse(request.user.userId),
		);
	});

	app.delete<{ Params: { userId: string } }>(
		"/my/staff/:userId",
		async (request, reply) => {
			await removeSeriesStaff(
				UserIdSchema.parse(request.user.userId),
				UserIdSchema.parse(request.params.userId),
			);
			return reply.code(204).send();
		},
	);
};
