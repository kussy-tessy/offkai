import { type FinanceLedger, syncBasicCharges } from "@offkai/core";
import type { FinanceSources } from "../../../repository/finance-ledger/sources";

/** Used only within transactions whose result is persisted before being returned. */
export function syncFinanceSources(
	state: FinanceLedger,
	source: FinanceSources,
) {
	const before = JSON.stringify({
		people: state.people,
		categories: state.categories,
		charges: state.charges,
	});
	for (const person of source.people)
		if (!state.people.some((p) => p.id === person.id))
			state.people.push(person);
	for (const q of source.questions) {
		const category = state.categories.find((c) => c.questionId === q.id);
		if (category) {
			category.name = q.label;
			if (!q.archived) category.memberIds = q.personIds;
		} else if (!q.archived)
			state.categories.push({
				id: q.id,
				questionId: q.id,
				name: q.label,
				baseAmount: 0,
				memberIds: q.personIds,
			});
	}
	syncBasicCharges(state);
	return (
		before !==
		JSON.stringify({
			people: state.people,
			categories: state.categories,
			charges: state.charges,
		})
	);
}

/** Display order only: reordering questions must not invalidate an accepted settlement. */
export function orderFinanceCategories(
	categories: FinanceLedger["categories"],
	questions: ReadonlyArray<{ id: string }>,
) {
	const questionOrder = new Map(questions.map((q, index) => [q.id, index]));
	const rank = (category: FinanceLedger["categories"][number]) =>
		category.questionId
			? (questionOrder.get(category.questionId) ?? questions.length)
			: questions.length + 1;
	return [...categories].sort((a, b) => rank(a) - rank(b));
}
