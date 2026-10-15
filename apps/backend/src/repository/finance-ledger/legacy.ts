import type { OffkaiEventId } from "@offkai/core";
import type { Prisma } from "@prisma/client";
import { EventFinanceRepository } from "../event-finance-repository";
import { ParticipantFinanceRepository } from "../participant-finance-repository";
import { SettlementExpenseRepository } from "../settlement-expense-repository";
import { SettlementIncomeRepository } from "../settlement-income-repository";
import { readFinanceSources } from "./sources";

export async function readLegacyFinance(
	client: Prisma.TransactionClient,
	eventId: OffkaiEventId,
) {
	const [finance, people, finances, expenses, incomes] = await Promise.all([
		new EventFinanceRepository(client).findByEventId(eventId),
		readFinanceSources(client, eventId).then((s) =>
			s.people.map((p) => ({ userId: p.id, displayName: p.name })),
		),
		new ParticipantFinanceRepository(client).findManyByEventId(eventId),
		new SettlementExpenseRepository(client).findManyByEventId(eventId),
		new SettlementIncomeRepository(client).findManyByEventId(eventId),
	]);
	const sources = await readFinanceSources(client, eventId);
	return { finance, people, finances, expenses, incomes, sources };
}
export type LegacyFinanceData = Awaited<ReturnType<typeof readLegacyFinance>>;
