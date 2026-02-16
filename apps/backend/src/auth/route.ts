import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../repository/prisma";

type RegisterBody = {
  loginId: string;
  password: string;
  name: string;
};

type LoginBody = {
  loginId: string;
  password: string;
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  // register
  app.post("/auth/register", async (request, reply) => {
    const body = request.body as RegisterBody;

    const loginId = (body.loginId ?? "").trim();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim();

    if (!loginId || !password || !name) {
      reply.code(400).send({ ok: false, error: "VALIDATION_ERROR" });
      return;
    }

    const normalizedLoginId = loginId.toLowerCase();

    const exists = await prisma.user.findUnique({
      where: { loginId: normalizedLoginId },
      select: { id: true },
    });
    if (exists) {
      reply.code(409).send({ ok: false, error: "LOGIN_ID_ALREADY_EXISTS" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        loginId: normalizedLoginId,
        name,
        passwordHash,
      },
      select: { id: true, loginId: true, name: true, createdAt: true },
    });

    const token = await app.auth.signAccessToken({ userId: user.id });
    app.auth.setAuthCookie(reply, token);

    reply.send({ ok: true, user });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = request.body as LoginBody;

    const loginId = (body.loginId ?? "").trim();
    const password = body.password ?? "";

    if (!loginId || !password) {
      reply.code(400).send({ ok: false, error: "VALIDATION_ERROR" });
      return;
    }

    const normalizedLoginId = loginId.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { loginId: normalizedLoginId },
      select: { id: true, loginId: true, name: true, passwordHash: true },
    });

    if (!user) {
      reply.code(401).send({ ok: false, error: "INVALID_CREDENTIALS" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      reply.code(401).send({ ok: false, error: "INVALID_CREDENTIALS" });
      return;
    }

    const token = await app.auth.signAccessToken({ userId: user.id });
    app.auth.setAuthCookie(reply, token);

    reply.send({
      ok: true,
      user: { id: user.id, loginId: user.loginId, name: user.name },
    });
  });

  // logout
  app.post("/auth/logout", async (_request, reply) => {
    app.auth.clearAuthCookie(reply);
    reply.send({ ok: true });
  });

  // me (login check)
  app.get(
    "/me",
    { preHandler: app.auth.requireUser },
    async (request, reply) => {
      const userId = request.user.userId;
      if (!userId) return; // requireUserが401を返している

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, loginId: true, name: true, createdAt: true },
      });
      console.log({ user })

      if (!user) {
        app.auth.clearAuthCookie(reply);
        reply.code(401).send({ ok: false, error: "UNAUTHORIZED" });
        return;
      }

      reply.send({ ok: true, user });
    },
  );
};
