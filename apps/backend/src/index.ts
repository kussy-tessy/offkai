import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { prisma } from "./repository/prisma";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify();

app.register(fastifyCors, {
  origin: ["http://localhost:5173"],
});

app.register(fastifyStatic, {
  root: join(__dirname, "../../frontend/dist"),
  prefix: "/",
});

app.get("/", (_, reply) => {
  reply.sendFile("index.html");
});

app.get("/api/hello", async () => {
  return prisma.user.findUnique({ where: { id: "1" } });
});

console.log('[BOOT] DATABASE_URL =', process.env.DATABASE_URL);
app.listen({ port: 3000, host: "0.0.0.0" });