import { UserIdSchema } from "@offkai/core";
import Fastify, { type FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { AppError, appErrorStatusCodes } from "../../../app-error";

const ledger = vi.hoisted(() => ({
	getLedger: vi.fn().mockResolvedValue({ active: true }),
	getLedgerHistory: vi.fn().mockResolvedValue([]),
	changeLedger: vi.fn().mockResolvedValue({ saved: true }),
	activateLedger: vi.fn(),
}));
const guard = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("./ledger.service", () => ledger);
vi.mock("../../../authorization/staff-permissions", async (original) => ({
	...(await original<object>()),
	requireAnyEventPermission: guard,
}));
vi.mock("../../../repository/prisma", () => ({
	prisma: {
		financeLedger: {
			findUnique: vi.fn().mockResolvedValue({ eventId: "active" }),
		},
	},
}));

import { offkaiEventRoute } from "../route";

const eventId = "019c0000-0000-7000-8000-000000000001";
const userId = UserIdSchema.parse("019c0000-0000-7000-8000-000000000002");
async function app() {
	const server = Fastify();
	server.decorate("auth", {
		requireUser: async (request: FastifyRequest) => {
			if (request.headers["x-test-user"] !== userId)
				throw new AppError("UNAUTHORIZED", "ログインしてください");
			request.user = { userId };
		},
	} as never);
	server.setErrorHandler((error, _, reply) => {
		reply
			.code(error instanceof AppError ? appErrorStatusCodes[error.code] : 500)
			.send({ message: error.message });
	});
	await server.register(offkaiEventRoute, { prefix: "/api/offkai-event" });
	return server;
}
describe("実際の親ルートへの接続", () => {
	it("新台帳のGETと更新APIを登録し認証を要求する", async () => {
		const server = await app();
		try {
			const anonymous = await server.inject({
				method: "GET",
				url: `/api/offkai-event/${eventId}/finance-ledger`,
			});
			expect(anonymous.statusCode).toBe(401);
			const get = await server.inject({
				method: "GET",
				url: `/api/offkai-event/${eventId}/finance-ledger`,
				headers: { "x-test-user": userId },
			});
			expect(get.statusCode).toBe(200);
			expect(get.json()).toEqual({ active: true });
			expect(ledger.getLedger).toHaveBeenCalledWith(eventId, userId);
			const post = await server.inject({
				method: "POST",
				url: `/api/offkai-event/${eventId}/finance-ledger/commands`,
				headers: { "x-test-user": userId },
				payload: { action: "confirm" },
			});
			expect(post.statusCode).toBe(200);
			expect(ledger.changeLedger).toHaveBeenCalledWith(eventId, userId, {
				action: "confirm",
			});
		} finally {
			await server.close();
		}
	});
	it("旧APIは認証・財務閲覧確認後に移行済み書込みを拒否", async () => {
		const server = await app();
		try {
			const url = `/api/offkai-event/${eventId}/finance/refunds/${userId}`;
			expect(
				(await server.inject({ method: "PUT", url, payload: {} })).statusCode,
			).toBe(401);
			const result = await server.inject({
				method: "PUT",
				url,
				headers: { "x-test-user": userId },
				payload: {},
			});
			expect(result.statusCode).toBe(409);
			expect(guard).toHaveBeenCalled();
		} finally {
			await server.close();
		}
	});
});
