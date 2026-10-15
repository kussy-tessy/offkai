import { type FinanceLedger, FinanceLedgerSchema } from "@offkai/core";
import type { LegacyFinanceData } from "../../../repository/finance-ledger/legacy";
import { syncFinanceSources } from "./ledger.sources";

export function buildLegacyLedger({
	finance,
	people,
	finances,
	expenses,
	incomes,
	sources,
}: LegacyFinanceData): FinanceLedger {
	const state: FinanceLedger = {
		version: 1,
		inputRevision: 0,
		roundingUnit: finance.refundRoundingUnit,
		people: people.map((p) => ({ id: p.userId, name: p.displayName })),
		categories: finance.categories.map((c) => ({
			id: c.id,
			questionId: c.commitmentQuestionId,
			name: c.name,
			baseAmount: c.baseParticipationFeeAmount,
			memberIds: c.members.map((m) => m.userId),
		})),
		items: [],
		charges: [],
		expenses: [],
		incomes: [],
		adjustments: [],
		payments: [],
		snapshot: null,
		migrationNotes: [],
	};
	const ensurePerson = (personId: string) => {
		if (!state.people.some((p) => p.id === personId))
			state.people.push({ id: personId, name: "旧データの参加者" });
	};
	const weights = (categoryId: string) => ({
		mode: "weights" as const,
		rows: (
			state.categories.find((c) => c.id === categoryId)?.memberIds ?? []
		).map((personId) => ({ personId, value: 1 })),
	});
	for (const c of finance.categories)
		for (const member of c.members) {
			ensurePerson(member.userId);
			state.charges.push({
				id: `charge:${c.id}:${member.userId}`,
				categoryId: c.id,
				personId: member.userId,
				title: c.name,
				amount: c.amountFor(member.userId) ?? 0,
				usesBaseAmount: member.amountOverride === null,
				isBase: true,
				note: "",
				confirmed: !!finance.feeCalculationLockedAt,
			});
		}
	for (const f of finances) {
		ensurePerson(f.userId);
		for (const extra of f.extraCharges)
			state.charges.push({
				id: extra.id,
				categoryId: null,
				personId: f.userId,
				title: extra.title,
				amount: extra.amount,
				note: extra.note ?? "",
				confirmed: !!finance.feeCalculationLockedAt,
			});
		const own = state.charges.filter((c) => c.personId === f.userId);
		if (f.collectedAt) {
			// Existing collection flags represent the full saved charge, not an inferred partial payment.
			const expected = own.reduce((s, c) => s + c.amount, 0);
			if (expected !== f.chargeAmount)
				state.migrationNotes.push(
					`${state.people.find((p) => p.id === f.userId)?.name}: 旧請求保存額${f.chargeAmount}円と明細合計${expected}円が異なります。徴収記録を確認してください。`,
				);
			let remaining: number = f.chargeAmount;
			for (const c of own) {
				const amount = Math.min(c.amount, remaining);
				remaining -= amount;
				if (amount > 0)
					state.payments.push({
						id: `legacy-collection:${c.id}`,
						kind: "collection",
						referenceId: c.id,
						amount,
						at: f.collectedAt.toISOString(),
						note: f.collectionNote ?? "",
						migrated: true,
					});
			}
			if (remaining > 0)
				state.migrationNotes.push(
					`${f.userId}: 明細に割り当てられない旧徴収額${remaining}円は未移行です。`,
				);
		}
		if (f.refundedAt && f.refundAmount)
			state.payments.push({
				id: `legacy-refund:${f.userId}`,
				kind: "refund",
				referenceId: f.userId,
				amount: f.refundAmount,
				at: f.refundedAt.toISOString(),
				note: f.refundNote ?? "",
				migrated: true,
			});
	}
	for (const e of expenses) {
		e.recipients.forEach((r) => {
			ensurePerson(r.userId);
		});
		state.expenses.push({
			id: e.id,
			categoryId: e.categoryId,
			itemId: null,
			title: e.title,
			amount: e.amount,
			kind: e.recipients.length ? "cooperation" : "expense",
			allocation: weights(e.categoryId),
			payerId: null,
			recipients: e.recipients.map((r) => ({
				personId: r.userId,
				amount: r.amount,
			})),
			note: e.note ?? "",
		});
	}
	state.incomes = incomes.map((i) => ({
		id: i.id,
		categoryId: i.categoryId,
		title: i.title,
		amount: i.amount,
		allocation: weights(i.categoryId),
		note: i.note ?? "",
	}));
	const targets: Record<string, number> = {};
	for (const f of finances)
		if (f.refundAmount !== null)
			targets[f.userId] =
				state.charges
					.filter((c) => c.personId === f.userId && c.categoryId)
					.reduce((s, c) => s + c.amount, 0) - f.refundAmount;
	if (Object.keys(targets).length)
		state.snapshot = {
			at:
				finance.settlementLockedAt?.toISOString() ?? "1970-01-01T00:00:00.000Z",
			actorId: "legacy",
			inputRevision: -1,
			targets,
			migrated: true,
		};
	if (incomes.length)
		state.migrationNotes.push(
			"旧その他収入の受領状況は不明です。実績を確認して受領を登録してください。経費は登録額を支出として計上します。",
		);
	syncFinanceSources(state, sources);
	return FinanceLedgerSchema.parse(state);
}
