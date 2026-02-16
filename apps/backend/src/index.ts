import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { authRoutes } from "./auth";
import { authPlugin } from "./plugin";
import { prisma } from "./repository/prisma";
import { offkaiEventRoute } from "./resource";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify();

app.register(fastifyCors, {
	origin: ["http://localhost:5173", "https://off.kg-misskey.net"],
	credentials: true,
});

app.get("/api/hello", async () => {
	return prisma.user.findUnique({ where: { id: "1" } });
});

app.register(authPlugin, {
	cookieDomain: process.env.COOKIE_DOMAIN, // 無ければundefinedでOK
});

app.register(authRoutes, { prefix: "/api" });
app.register(offkaiEventRoute, { prefix: "/api/offkai-event" });

app.register(fastifyStatic, {
	root: join(__dirname, "../../frontend/dist"),
	prefix: "/",
});

app.setNotFoundHandler((req, reply) => {
	if (req.raw.url?.startsWith("/api/")) {
		reply.code(404).send({ message: "API route not found" });
		return;
	}
	reply.sendFile("index.html");
});

app.listen({ port: 3000, host: "0.0.0.0" });

app.setErrorHandler((err, _req, _reply) => {
	console.error(err);
	throw err;
});
