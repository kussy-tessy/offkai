import {
	type FinanceLedger,
	FinanceLedgerSchema,
	validateFinanceLedger,
} from "@offkai/core";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Current state is reconstructed from relational rows; JSON exists only in history. */
export async function readLedger(tx: Tx, eventId: string) {
	const header = await tx.financeLedger.findUnique({ where: { eventId } });
	if (!header) return null;
	const [
		person,
		category,
		categoryMember,
		item,
		charge,
		expense,
		income,
		adjustment,
		payment,
		itemAllocation,
		expenseAllocation,
		incomeAllocation,
		expenseRecipient,
		settlementTarget,
		migrationNote,
	] = await Promise.all([
		tx.financePerson.findMany({ where: { eventId } }),
		tx.financeCategory.findMany({ where: { eventId } }),
		tx.financeCategoryMember.findMany({ where: { eventId } }),
		tx.financeItem.findMany({ where: { eventId } }),
		tx.financeCharge.findMany({ where: { eventId } }),
		tx.financeExpense.findMany({ where: { eventId } }),
		tx.financeIncome.findMany({ where: { eventId } }),
		tx.financeAdjustment.findMany({ where: { eventId } }),
		tx.financePayment.findMany({ where: { eventId } }),
		tx.financeItemAllocation.findMany({ where: { eventId } }),
		tx.financeExpenseAllocation.findMany({ where: { eventId } }),
		tx.financeIncomeAllocation.findMany({ where: { eventId } }),
		tx.financeExpenseRecipient.findMany({ where: { eventId } }),
		tx.financeSettlementTarget.findMany({ where: { eventId } }),
		tx.financeMigrationNote.findMany({ where: { eventId } }),
	]);
	const ordered = <T extends { position: number }>(rows: T[]) =>
		rows.sort((a, b) => a.position - b.position);
	const state = FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: header.inputRevision,
		roundingUnit: header.roundingUnit,
		people: ordered(person).map((p) => ({
			id: p.id,
			name: p.name,
			...(p.settlementStarted ? { settlementStarted: true } : {}),
		})),
		categories: ordered(category).map((c) => ({
			id: c.id,
			questionId: c.questionId,
			name: c.name,
			baseAmount: c.baseAmount,
			memberIds: categoryMember
				.filter((m) => m.categoryId === c.id)
				.map((m) => m.personId)
				.sort(),
		})),
		items: ordered(item).map((i) => ({
			id: i.id,
			categoryId: i.categoryId,
			name: i.name,
			allocation: {
				mode: i.allocationMode,
				rows: itemAllocation
					.filter((a) => a.itemId === i.id)
					.map((a) => ({ personId: a.personId, value: Number(a.value) }))
					.sort((a, b) => a.personId.localeCompare(b.personId)),
			},
		})),
		charges: ordered(charge).map((c) => ({
			id: c.id,
			personId: c.personId,
			categoryId: c.categoryId,
			title: c.title,
			amount:
				c.amountOverride ??
				category.find((x) => x.id === c.categoryId)!.baseAmount,
			usesBaseAmount: c.amountOverride === null,
			isBase: c.isBase || undefined,
			confirmed: true,
			note: c.note,
		})),
		expenses: ordered(expense).map((e) => ({
			id: e.id,
			categoryId: e.categoryId,
			itemId: e.itemId,
			title: e.title,
			amount: e.amount,
			kind: e.kind,
			payerId: e.payerId,
			note: e.note,
			allocation: {
				mode: e.allocationMode,
				rows: expenseAllocation
					.filter((a) => a.expenseId === e.id)
					.map((a) => ({ personId: a.personId, value: Number(a.value) }))
					.sort((a, b) => a.personId.localeCompare(b.personId)),
			},
			recipients: expenseRecipient
				.filter((r) => r.expenseId === e.id)
				.map((r) => ({ personId: r.personId, amount: r.amount }))
				.sort((a, b) => a.personId.localeCompare(b.personId)),
		})),
		incomes: ordered(income).map((i) => ({
			id: i.id,
			categoryId: i.categoryId,
			title: i.title,
			amount: i.amount,
			note: i.note,
			allocation: {
				mode: i.allocationMode,
				rows: incomeAllocation
					.filter((a) => a.incomeId === i.id)
					.map((a) => ({ personId: a.personId, value: Number(a.value) }))
					.sort((a, b) => a.personId.localeCompare(b.personId)),
			},
		})),
		adjustments: ordered(adjustment).map((a) => ({
			id: a.id,
			personId: a.personId,
			mode: a.mode,
			amount: a.amount,
			note: a.note,
		})),
		payments: ordered(payment).map((p) => ({
			id: p.id,
			kind: p.kind,
			referenceId: p.chargeId ?? p.personId ?? p.expenseId ?? p.incomeId,
			amount: p.amount,
			at: p.at.toISOString(),
			note: p.note,
			migrated: p.migrated,
		})),
		snapshot: header.snapshotAt
			? {
					at: header.snapshotAt.toISOString(),
					actorId: header.snapshotActorId,
					inputRevision: header.snapshotRevision,
					migrated: header.snapshotMigrated,
					targets: Object.fromEntries(
						settlementTarget.map((t) => [t.personId, t.amount]),
					),
				}
			: null,
		migrationNotes: ordered(migrationNote).map((n) => n.message),
	});
	// Settlement mode is only needed while a refund or recovery record exists.
	// Reconcile legacy flags left behind when those records were deleted before
	// clearing the flag was implemented.
	for (const person of state.people) {
		person.settlementStarted = state.payments.some(
			(payment) =>
				(payment.kind === "refund" || payment.kind === "recovery") &&
				payment.referenceId === person.id,
		);
	}
	validateFinanceLedger(state);
	return { revision: header.revision, state };
}

/** Caller holds the event lock and writes revision/history in the same transaction. */
export async function writeLedger(
	tx: Tx,
	eventId: string,
	state: FinanceLedger,
) {
	validateFinanceLedger(state);
	await tx.financeLedger.update({
		where: { eventId },
		data: {
			inputRevision: state.inputRevision,
			roundingUnit: state.roundingUnit,
			snapshotAt: state.snapshot ? new Date(state.snapshot.at) : null,
			snapshotActorId: state.snapshot?.actorId ?? null,
			snapshotRevision: state.snapshot?.inputRevision ?? null,
			snapshotMigrated: state.snapshot?.migrated ?? false,
		},
	});
	await tx.financeCategoryMember.deleteMany({ where: { eventId } });
	await tx.financeItemAllocation.deleteMany({ where: { eventId } });
	await tx.financeExpenseAllocation.deleteMany({ where: { eventId } });
	await tx.financeIncomeAllocation.deleteMany({ where: { eventId } });
	await tx.financeExpenseRecipient.deleteMany({ where: { eventId } });
	await tx.financeSettlementTarget.deleteMany({ where: { eventId } });
	await tx.financeMigrationNote.deleteMany({ where: { eventId } });
	for (const [position, r] of state.people.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			name: r.name,
			settlementStarted: r.settlementStarted ?? false,
		};
		await tx.financePerson.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.categories.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			questionId: r.questionId ?? null,
			name: r.name,
			baseAmount: r.baseAmount,
		};
		await tx.financeCategory.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.items.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			categoryId: r.categoryId,
			name: r.name,
			allocationMode: r.allocation.mode,
		};
		await tx.financeItem.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.charges.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			personId: r.personId,
			categoryId: r.categoryId,
			title: r.title,
			amountOverride: r.usesBaseAmount ? null : r.amount,
			isBase: r.isBase ?? false,
			note: r.note,
		};
		await tx.financeCharge.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.expenses.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			categoryId: r.categoryId,
			itemId: r.itemId,
			title: r.title,
			amount: r.amount,
			kind: r.kind,
			allocationMode: r.allocation.mode,
			payerId: r.payerId,
			note: r.note,
		};
		await tx.financeExpense.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.incomes.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			categoryId: r.categoryId,
			title: r.title,
			amount: r.amount,
			allocationMode: r.allocation.mode,
			note: r.note,
		};
		await tx.financeIncome.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.adjustments.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			personId: r.personId,
			mode: r.mode,
			amount: r.amount,
			note: r.note,
		};
		await tx.financeAdjustment.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	for (const [position, r] of state.payments.entries()) {
		const data = {
			eventId,
			position,
			id: r.id,
			kind: r.kind,
			amount: r.amount,
			at: new Date(r.at),
			note: r.note,
			migrated: r.migrated,
			chargeId: r.kind === "collection" ? r.referenceId : null,
			personId: ["refund", "recovery"].includes(r.kind) ? r.referenceId : null,
			expenseId: r.kind === "expense" ? r.referenceId : null,
			incomeId: r.kind === "income" ? r.referenceId : null,
		};
		await tx.financePayment.upsert({
			where: { eventId_id: { eventId, id: r.id } },
			create: data,
			update: data,
		});
	}
	await tx.financePayment.deleteMany({
		where: { eventId, id: { notIn: state.payments.map((r) => r.id) } },
	});
	await tx.financeAdjustment.deleteMany({
		where: { eventId, id: { notIn: state.adjustments.map((r) => r.id) } },
	});
	await tx.financeIncome.deleteMany({
		where: { eventId, id: { notIn: state.incomes.map((r) => r.id) } },
	});
	await tx.financeExpense.deleteMany({
		where: { eventId, id: { notIn: state.expenses.map((r) => r.id) } },
	});
	await tx.financeCharge.deleteMany({
		where: { eventId, id: { notIn: state.charges.map((r) => r.id) } },
	});
	await tx.financeItem.deleteMany({
		where: { eventId, id: { notIn: state.items.map((r) => r.id) } },
	});
	await tx.financeCategory.deleteMany({
		where: { eventId, id: { notIn: state.categories.map((r) => r.id) } },
	});
	await tx.financePerson.deleteMany({
		where: { eventId, id: { notIn: state.people.map((r) => r.id) } },
	});
	if (state.categories.some((c) => c.memberIds.length))
		await tx.financeCategoryMember.createMany({
			data: state.categories.flatMap((c) =>
				c.memberIds.map((personId) => ({
					eventId,
					categoryId: c.id,
					personId,
				})),
			),
		});
	if (state.items.some((r) => r.allocation.rows.length))
		await tx.financeItemAllocation.createMany({
			data: state.items.flatMap((r) =>
				r.allocation.rows.map((a) => ({
					eventId,
					itemId: r.id,
					personId: a.personId,
					value: a.value,
				})),
			),
		});
	if (state.expenses.some((r) => r.allocation.rows.length))
		await tx.financeExpenseAllocation.createMany({
			data: state.expenses.flatMap((r) =>
				r.allocation.rows.map((a) => ({
					eventId,
					expenseId: r.id,
					personId: a.personId,
					value: a.value,
				})),
			),
		});
	if (state.incomes.some((r) => r.allocation.rows.length))
		await tx.financeIncomeAllocation.createMany({
			data: state.incomes.flatMap((r) =>
				r.allocation.rows.map((a) => ({
					eventId,
					incomeId: r.id,
					personId: a.personId,
					value: a.value,
				})),
			),
		});
	if (state.expenses.some((e) => e.recipients.length))
		await tx.financeExpenseRecipient.createMany({
			data: state.expenses.flatMap((e) =>
				e.recipients.map((r) => ({
					eventId,
					expenseId: e.id,
					personId: r.personId,
					amount: r.amount,
				})),
			),
		});
	if (state.snapshot && Object.keys(state.snapshot.targets).length)
		await tx.financeSettlementTarget.createMany({
			data: Object.entries(state.snapshot.targets).map(
				([personId, amount]) => ({ eventId, personId, amount }),
			),
		});
	if (state.migrationNotes.length)
		await tx.financeMigrationNote.createMany({
			data: state.migrationNotes.map((message, position) => ({
				eventId,
				position,
				message,
			})),
		});
}
