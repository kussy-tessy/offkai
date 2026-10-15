import { type FinanceLedger, FinanceLedgerSchema } from "@offkai/core";
import type { Prisma } from "@prisma/client";
import { v7 as uuidv7 } from "uuid";

export interface LedgerHistoryInput {
	eventId: string;
	state: FinanceLedger;
	revision: number;
	actorId: string;
	action: string;
	resource: string;
	requestId?: string;
}
export async function saveHistory(
	client: Prisma.TransactionClient,
	input: LedgerHistoryInput,
) {
	const { state, ...metadata } = input;
	await client.financeLedgerHistory.create({
		data: {
			...metadata,
			id: uuidv7(),
			requestId: input.requestId ?? uuidv7(),
			state: JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue,
		},
	});
}
export async function readHistory(
	client: Prisma.TransactionClient,
	eventId: string,
) {
	const rows = await client.financeLedgerHistory.findMany({
		where: { eventId },
		orderBy: { revision: "desc" },
		take: 100,
	});
	const actors = await client.user.findMany({
		where: { id: { in: [...new Set(rows.map((row) => row.actorId))] } },
		select: { id: true, name: true },
	});
	const names = new Map(actors.map((actor) => [actor.id, actor.name]));
	return rows.map((row) => ({
		revision: row.revision,
		at: row.createdAt.toISOString(),
		actorId: row.actorId,
		actorName:
			names.get(row.actorId) ??
			(row.actorId === "legacy" ? "旧データ移行" : "名前不明のユーザー"),
		action: row.action,
		resource: row.resource,
		state: FinanceLedgerSchema.parse(
			row.state && typeof row.state === "object" && !Array.isArray(row.state)
				? {
						...row.state,
						payments: Array.isArray(row.state.payments)
							? row.state.payments.filter(
									(payment) =>
										!payment ||
										typeof payment !== "object" ||
										!("kind" in payment) ||
										[
											"collection",
											"refund",
											"recovery",
											"expense",
											"income",
										].includes(String(payment.kind)),
								)
							: [],
					}
				: row.state,
		),
	}));
}
