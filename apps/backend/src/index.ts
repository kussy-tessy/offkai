import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { ZodError } from "zod";
import { AppError, appErrorStatusCodes } from "./app-error";
import { authRoutes } from "./auth";
import { authPlugin } from "./plugin";
import { prisma } from "./repository/prisma";
import { discordRoute, kigurumiRoute, offkaiEventRoute, seriesRoute } from "./usecase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify();

app.register(fastifyCors, {
	origin: ["http://localhost:5173", "https://off.kg-misskey.net"],
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	credentials: true,
});

app.get("/api/hello", async () => {
	return prisma.user.findUnique({ where: { id: "1" } });
});

app.register(authPlugin, {
	cookieDomain: process.env.COOKIE_DOMAIN, // 無ければundefinedでOK
});

// ルートの登録
app.register(authRoutes, { prefix: "/api" });
app.register(discordRoute, { prefix: "/api/discord" });
app.register(kigurumiRoute, { prefix: "/api/kigurumi" });
app.register(offkaiEventRoute, { prefix: "/api/offkai-event" });
app.register(seriesRoute, { prefix: "/api/series" });

app.register(fastifyStatic, {
	root: join(__dirname, "../../frontend/dist"),
	prefix: "/",
});

app.setNotFoundHandler((req, reply) => {
	if (req.raw.url?.startsWith("/api/")) {
		reply.code(404).send({
			code: "API_NOT_FOUND",
			message: "APIが見つかりません。",
		});
		return;
	}
	reply.sendFile("index.html");
});

app.setErrorHandler((error, _request, reply) => {
	console.error(error);
	if (error instanceof ZodError) {
		return reply.code(400).send({
			code: "VALIDATION_ERROR",
			message: "入力内容を確認してください。",
		});
	}

	if (
		error.statusCode === 400 ||
		error.code === "FST_ERR_CTP_INVALID_JSON_BODY"
	) {
		return reply.code(400).send({
			code: "VALIDATION_ERROR",
			message: "リクエストの形式を確認してください。",
		});
	}

	if (error instanceof AppError) {
		return reply.code(appErrorStatusCodes[error.code]).send({
			code: error.code,
			message: error.message,
		});
	}

	console.error(error);
	return reply.code(500).send({
		code: "INTERNAL_SERVER_ERROR",
		message: "予期しないエラーが発生しました。",
	});
});

app.listen({ port: 3000, host: "0.0.0.0" });
