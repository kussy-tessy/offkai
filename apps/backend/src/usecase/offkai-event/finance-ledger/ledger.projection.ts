import { createHash } from "node:crypto";
import { calculateFinanceLedger, type FinanceLedger } from "@offkai/core";
import {
	allowsLedger,
	canReadLedgerResource,
	type LedgerAccess,
} from "./ledger-permissions";

export const fingerprint = (state: FinanceLedger) =>
	createHash("sha256").update(JSON.stringify(state)).digest("hex");

export function projectLedger(
	state: FinanceLedger,
	revision: number,
	active: boolean,
	access: LedgerAccess,
) {
	const full = calculateFinanceLedger(state);
	const settlement = allowsLedger(access, {
		area: "settlement",
		level: "read",
	});
	const refund = allowsLedger(access, { area: "refund", level: "read" });
	const chargesVisible = canReadLedgerResource(access, "charges");
	const safe = {
		...state,
		people: state.people.map((person) => ({
			...person,
			settlementStarted:
				full.participants.find((p) => p.id === person.id)?.settlementStarted ??
				false,
		})),
		categories: chargesVisible ? state.categories : [],
		charges: chargesVisible ? state.charges : [],
		items: settlement ? state.items : [],
		expenses: settlement ? state.expenses : [],
		incomes: settlement ? state.incomes : [],
		adjustments: settlement ? state.adjustments : [],
		payments: state.payments.filter((p) =>
			canReadLedgerResource(access, "payments", p),
		),
		snapshot: settlement || refund ? state.snapshot : null,
		migrationNotes: settlement ? state.migrationNotes : [],
	};
	return {
		active,
		revision,
		fingerprint: !active && access.owner ? fingerprint(state) : null,
		access,
		state: safe,
		calculation: {
			...full,
			charges: chargesVisible ? full.charges : [],
			unallocated: settlement ? full.unallocated : [],
			cash: settlement ? full.cash : null,
			independentCash: settlement ? full.independentCash : null,
			expenseOutstanding: settlement ? full.expenseOutstanding : null,
			incomeOutstanding: settlement ? full.incomeOutstanding : null,
			projected: settlement ? full.projected : null,
			participants: full.participants.map((p) => ({
				...p,
				charged: chargesVisible ? p.charged : 0,
				received: chargesVisible ? p.received : 0,
				cost: settlement ? p.cost : 0,
				benefit: settlement ? p.benefit : 0,
				receivable: settlement ? p.receivable : 0,
				automatic: settlement ? p.automatic : 0,
				proposedRefund: settlement ? p.proposedRefund : 0,
				proposedTarget: settlement ? p.proposedTarget : 0,
				proposedRemaining: settlement ? p.proposedRemaining : 0,
				acceptedTarget: settlement || refund ? p.acceptedTarget : null,
				refunded: settlement || refund ? p.refunded : 0,
				recovered: chargesVisible ? p.recovered : 0,
				remaining:
					settlement ||
					refund ||
					allowsLedger(access, { area: "feeCollection", level: "read" })
						? p.remaining
						: null,
				independentOutstanding:
					chargesVisible || refund ? p.independentOutstanding : 0,
				independentUncollected:
					chargesVisible || refund ? p.independentUncollected : 0,
				independentOvercollected:
					chargesVisible || refund ? p.independentOvercollected : 0,
				breakdowns: settlement ? p.breakdowns : [],
			})),
		},
	};
}
