import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prisma } from "./repository/prisma";
import { offkaiEventRoute } from "./resource";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify();

app.register(fastifyCors, {
	origin: ["http://localhost:5173", "https://off.kg-misskey.net"],
});

app.get("/", (_, reply) => {
	reply.sendFile("index.html");
});

app.get("/api/hello", async () => {
	return prisma.user.findUnique({ where: { id: "1" } });
});

app.register(offkaiEventRoute, { prefix: "/api/offkai-event" });

app.register(fastifyStatic, {
	root: join(__dirname, "../../frontend/dist"),
	prefix: "/",
});

console.log("[BOOT] DATABASE_URL =", process.env.DATABASE_URL);
app.listen({ port: 3000, host: "0.0.0.0" });

app.setErrorHandler((err, req, reply) => {
	console.error(err);
	throw err;
});
