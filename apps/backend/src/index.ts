import 'dotenv/config';
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

const isProd = process.env.NODE_ENV === "production";

app.register(fastifyStatic, {
  root: isProd ? join(__dirname, "../../frontend/dist")
    : join(__dirname, "../public"),
  prefix: "/",
});

app.get("/api/hello", async () => {
  return prisma.user.findUnique({where: {id: "1"}});
});

app.listen({ port: 3000, host: "0.0.0.0" });
