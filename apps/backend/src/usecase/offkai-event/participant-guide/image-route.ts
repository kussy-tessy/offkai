import {
	GUIDE_IMAGE_MAX_BYTES,
	ParticipantGuideImageParamsSchema,
	ParticipantGuideRouteParamsSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { cleanGuideImages } from "../../../service/guide-image-storage";
import {
	deleteGuideImage,
	getGuideImageUrl,
	getMyGuideFee,
	listGuideImages,
	uploadGuideImage,
} from "./images";
import { getParticipantGuide } from "./participant-guide.usecase";

export const participantGuideImageRoute: FastifyPluginAsync = async (app) => {
	app.addContentTypeParser(
		"application/octet-stream",
		{ parseAs: "buffer", bodyLimit: GUIDE_IMAGE_MAX_BYTES },
		(_request, body, done) => done(null, body),
	);
	app.addHook("onRequest", async (request, reply) => {
		await app.auth.requireUser(request, reply);
		if (reply.sent) return;
		const { eventId } = ParticipantGuideRouteParamsSchema.parse(request.params);
		const userId = UserIdSchema.parse(request.user.userId);
		if (request.method === "GET")
			await getParticipantGuide({ eventId }, userId);
		else
			await requireEventPermission(eventId, userId, {
				area: "eventManagement",
			});
		reply.header("Cache-Control", "no-store");
	});
	app.setErrorHandler((error, _request, reply) => {
		if (error.statusCode === 413)
			return reply.code(413).send({
				code: "VALIDATION_ERROR",
				message: "画像は1枚10MB以下にしてください。",
			});
		throw error; // Delegate other failures to the application's error handler.
	});
	app.get("/:eventId/participant-guide/images", async (request) => {
		const { eventId } = ParticipantGuideRouteParamsSchema.parse(request.params);
		return listGuideImages(eventId);
	});
	app.get("/:eventId/participant-guide/my-fee", async (request) => {
		const { eventId } = ParticipantGuideRouteParamsSchema.parse(request.params);
		return getMyGuideFee(eventId, UserIdSchema.parse(request.user.userId));
	});
	app.get("/:eventId/participant-guide/images/:imageId", async (request) => {
		const { eventId, imageId } = ParticipantGuideImageParamsSchema.parse(
			request.params,
		);
		return getGuideImageUrl(eventId, imageId);
	});
	app.post(
		"/:eventId/participant-guide/images/:imageId",
		{ bodyLimit: GUIDE_IMAGE_MAX_BYTES },
		async (request: FastifyRequest, reply) => {
			const { eventId, imageId } = ParticipantGuideImageParamsSchema.parse(
				request.params,
			);
			if (!Buffer.isBuffer(request.body))
				throw new AppError(
					"VALIDATION_ERROR",
					"画像ファイルを送信してください。",
				);
			const result = await uploadGuideImage(
				eventId,
				imageId,
				UserIdSchema.parse(request.user.userId),
				request.body,
			);
			return reply.code(201).send(result);
		},
	);
	app.delete(
		"/:eventId/participant-guide/images/:imageId",
		async (request, reply) => {
			const { eventId, imageId } = ParticipantGuideImageParamsSchema.parse(
				request.params,
			);
			await deleteGuideImage(eventId, imageId);
			void cleanGuideImages().catch(() =>
				console.warn("R2 cleanup will be retried"),
			);
			return reply.code(204).send();
		},
	);
};
