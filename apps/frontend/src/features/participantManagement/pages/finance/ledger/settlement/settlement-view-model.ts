import type { LedgerPage } from "@offkai/core";

type Participant = LedgerPage["calculation"]["participants"][number];

export interface CategoryBreakdown {
	charged: number;
	received: number;
	rows: Participant["breakdowns"];
	refund: number;
}

function categoryBreakdown(
	page: LedgerPage,
	participant: Participant,
	categoryId: string,
): CategoryBreakdown {
	const charges = page.calculation.charges.filter(
		(charge) =>
			charge.personId === participant.id && charge.categoryId === categoryId,
	);
	const charged = charges.reduce((sum, charge) => sum + charge.amount, 0);
	const received = charges.reduce((sum, charge) => sum + charge.received, 0);
	const rows = participant.breakdowns.filter(
		(row) => row.categoryId === categoryId && row.amount !== 0,
	);
	const allocatedRefund = rows.reduce((sum, row) => {
		const amount = row.kind === "expense" ? -row.amount : row.amount;
		return sum + amount;
	}, 0);

	return { charged, received, rows, refund: charged + allocatedRefund };
}

export function buildParticipantCategories(page: LedgerPage) {
	const groups: Record<string, Record<string, CategoryBreakdown>> = {};
	for (const participant of page.calculation.participants) {
		const categories: Record<string, CategoryBreakdown> = {};
		for (const category of page.state.categories) {
			categories[category.id] = categoryBreakdown(
				page,
				participant,
				category.id,
			);
		}
		groups[participant.id] = categories;
	}
	return groups;
}

export function eventTotals(page: LedgerPage) {
	const charges = page.calculation.charges.filter(
		(charge) => charge.categoryId !== null,
	);
	const incomeIds = new Set(page.state.incomes.map((income) => income.id));
	const expectedFees = charges.reduce((sum, charge) => sum + charge.amount, 0);
	const expectedIncome = page.state.incomes.reduce(
		(sum, income) => sum + income.amount,
		0,
	);
	const receivedFees = charges.reduce(
		(sum, charge) => sum + charge.received,
		0,
	);
	const receivedIncome = page.state.payments
		.filter(
			(payment) =>
				payment.kind === "income" && incomeIds.has(payment.referenceId),
		)
		.reduce((sum, payment) => sum + payment.amount, 0);
	const expenses = page.state.expenses
		.filter((expense) => expense.kind !== "independent")
		.reduce((sum, expense) => sum + expense.amount, 0);
	return {
		expected: expectedFees + expectedIncome,
		received: receivedFees + receivedIncome,
		expenses,
	};
}
