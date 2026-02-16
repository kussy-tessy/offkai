import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    auth: {
      signAccessToken: (payload: { userId: string }) => Promise<string>;
      setAuthCookie: (reply: FastifyReply, token: string) => void;
      clearAuthCookie: (reply: FastifyReply) => void;
      requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    };
  }
}

type AuthPluginOptions = {
  cookieDomain?: string;
};

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, opts) => {
  // Cookie
  await app.register(cookie);

  // JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret",
    cookie: {
      cookieName: "offkai_token",
      signed: false,
    },
  });

  const isProd = process.env.NODE_ENV === "production";

  const cookieName = "offkai_token"; // access token

  // Cookie options
  const baseCookieOptions = {
    httpOnly: true,
    secure: isProd, // https本番でtrue
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    ...(isProd && process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {}),
  };

  app.decorate("auth", {
    signAccessToken: async (payload: { userId: string }) => {
      return app.jwt.sign(payload, { expiresIn: "24h" });
    },

    setAuthCookie: (reply: FastifyReply, token: string) => {
      reply.setCookie(cookieName, token, {
        ...baseCookieOptions,
        maxAge: 60 * 60 * 24, // 24h
      });
    },

    clearAuthCookie: (reply: FastifyReply) => {
      reply.clearCookie(cookieName, { ...baseCookieOptions });
    },

    requireUser: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (e) {
        // 401
        reply.code(401).send({ ok: false, error: "UNAUTHORIZED" });
      }
    },
  });
};

export default fp(authPlugin, { name: "authPlugin" });
