import {
	type GetEventSettlementResponse,
	GetEventSettlementResponseSchema,
	type OffkaiEventId,
	SettlementCalculator,
	type Unbrand,
} from "@offkai/core";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	SettlementExpenseRepository,
	SettlementIncomeRepository,
} from "../repository";

export class SettlementPageAssembler {
	constructor(
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly expenseRepository = new SettlementExpenseRepository(),
		private readonly incomeRepository = new SettlementIncomeRepository(),
	) {}

	async build(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		const [finance, participants, expenses, incomes] = await Promise.all([
			this.financeRepository.findByEventId(eventId),
			this.eventRepository.findParticipantsByEventId(eventId),
			this.expenseRepository.findManyByEventId(eventId),
			this.incomeRepository.findManyByEventId(eventId),
		]);
		const displayNameByUserId = new Map(
			participants.map((participant) => [
				participant.userId,
				participant.displayName,
			]),
		);

		return GetEventSettlementResponseSchema.parse({
			feeCalculationLockedAt:
				finance.feeCalculationLockedAt?.toISOString() ?? null,
			settlementLockedAt: finance.settlementLockedAt?.toISOString() ?? null,
			refundStartedAt: finance.refundStartedAt?.toISOString() ?? null,
			participants: participants.map(({ userId, displayName }) => ({
				userId,
				displayName,
			})),
			categories: finance.categories.map((category) => {
				const categoryExpenses = expenses.filter(
					(expense) => expense.categoryId === category.id,
				);
				const categoryIncomes = incomes.filter(
					(income) => income.categoryId === category.id,
				);
				const calculation = SettlementCalculator.calculate(
					category,
					categoryExpenses,
					categoryIncomes,
				);
				return {
					id: category.id,
					name: category.name,
					...calculation,
					expenses: categoryExpenses,
					incomes: categoryIncomes,
					participantBreakdowns: calculation.participantBreakdowns.map(
						(breakdown) => ({
							...breakdown,
							displayName:
								displayNameByUserId.get(breakdown.userId) ?? "不明な参加者",
						}),
					),
				};
			}),
			extraChargesExcluded: true,
		});
	}
}
