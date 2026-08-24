import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { UserId } from "@offkai/core";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { AppError } from "../app-error";
import { REFRESH_TOKEN_MAX_AGE_SECONDS } from "../auth/refresh-token";

declare module "fastify" {
	interface FastifyInstance {
		auth: {
			signAccessToken: (payload: { userId: UserId }) => Promise<string>;
			setAuthCookie: (reply: FastifyReply, token: string) => void;
			setRefreshCookie: (reply: FastifyReply, token: string) => void;
			clearAuthCookie: (reply: FastifyReply) => void;
			clearRefreshCookie: (reply: FastifyReply) => void;
			requireUser: (
				request: FastifyRequest,
				reply: FastifyReply,
			) => Promise<void>;
			resolveOptionalUser: (request: FastifyRequest) => Promise<UserId | null>;
		};
	}
}

type AuthPluginOptions = {
	cookieDomain?: string;
};

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
	app,
) => {
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

	const COOKIE_NAME = "offkai_token"; // access token
	const REFRESH_COOKIE_NAME = "offkai_refresh_token";
	const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15;

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
		signAccessToken: async (payload: { userId: UserId }) => {
			return app.jwt.sign(payload, { expiresIn: "15m" });
		},

		setAuthCookie: (reply: FastifyReply, token: string) => {
			reply.setCookie(COOKIE_NAME, token, {
				...baseCookieOptions,
				maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
			});
		},

		setRefreshCookie: (reply: FastifyReply, token: string) => {
			reply.setCookie(REFRESH_COOKIE_NAME, token, {
				...baseCookieOptions,
				path: "/api/auth",
				maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
			});
		},

		clearAuthCookie: (reply: FastifyReply) => {
			reply.clearCookie(COOKIE_NAME, { ...baseCookieOptions });
		},

		clearRefreshCookie: (reply: FastifyReply) => {
			reply.clearCookie(REFRESH_COOKIE_NAME, {
				...baseCookieOptions,
				path: "/api/auth",
			});
		},

		requireUser: async (request: FastifyRequest, _reply: FastifyReply) => {
			try {
				await request.jwtVerify();
			} catch (_e) {
				throw new AppError("UNAUTHORIZED", "ログインが必要です。");
			}
		},

		resolveOptionalUser: async (request: FastifyRequest) => {
			if (!request.cookies[COOKIE_NAME]) return null;
			try {
				await request.jwtVerify();
				return request.user.userId;
			} catch {
				return null;
			}
		},
	});
};

export default fp(authPlugin, { name: "authPlugin" });
