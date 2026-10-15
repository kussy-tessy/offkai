import { z } from "zod";
import { GUIDE_IMAGE_MAX_BYTES, OffkaiEventIdSchema } from "@offkai/core";
import { AppError } from "../../app-error";
import {
	getKigurumiImage,
	uploadKigurumiImage,
	deleteKigurumiImage,
} from "./images";
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
	app.addHook("onRequest", app.auth.requireUser);
	app.setErrorHandler((error, _request, reply) => {
		if (error.statusCode === 413)
			return reply
				.code(413)
				.send({
					code: "VALIDATION_ERROR",
					message: "画像は1枚10MB以下にしてください。",
				});
		throw error;
	});
	app.addContentTypeParser(
		"application/octet-stream",
		{ parseAs: "buffer", bodyLimit: GUIDE_IMAGE_MAX_BYTES },
		(_req, body, done) => done(null, body),
	);
	app.get("/:kigurumiId/image", async (request, reply) => {
		reply.header("Cache-Control", "no-store");
		const { kigurumiId } = KigurumiRouteParamsSchema.parse(request.params);
		const { eventId } = z
			.object({ eventId: OffkaiEventIdSchema.optional() })
			.parse(request.query);
		return getKigurumiImage(
			kigurumiId,
			UserIdSchema.parse(request.user.userId),
			eventId,
		);
	});
	app.post(
		"/:kigurumiId/image",
		{ bodyLimit: GUIDE_IMAGE_MAX_BYTES },
		async (request) => {
			const { kigurumiId } = KigurumiRouteParamsSchema.parse(request.params);
			if (!Buffer.isBuffer(request.body))
				throw new AppError(
					"VALIDATION_ERROR",
					"画像ファイルを送信してください。",
				);
			return uploadKigurumiImage(
				kigurumiId,
				UserIdSchema.parse(request.user.userId),
				request.body,
			);
		},
	);
	app.delete("/:kigurumiId/image", async (request, reply) => {
		const { kigurumiId } = KigurumiRouteParamsSchema.parse(request.params);
		await deleteKigurumiImage(
			kigurumiId,
			UserIdSchema.parse(request.user.userId),
		);
		return reply.code(204).send();
	});

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
