import {
	type GetEventSettlementResponse,
	GetEventSettlementResponseSchema,
	type OffkaiEventId,
	FinalRefundCalculator,
	SettlementCalculator,
	type Unbrand,
} from "@offkai/core";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	SettlementExpenseRepository,
	SettlementIncomeRepository,
	ParticipantFinanceRepository,
} from "../repository";

export class SettlementPageAssembler {
	constructor(
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly expenseRepository = new SettlementExpenseRepository(),
		private readonly incomeRepository = new SettlementIncomeRepository(),
		private readonly participantRepository = new ParticipantFinanceRepository(),
	) {}

	async build(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		const [finance, participants, participantFinances, expenses, incomes] = await Promise.all([
			this.financeRepository.findByEventId(eventId),
			this.eventRepository.findParticipantsByEventId(eventId),
			this.participantRepository.findManyByEventId(eventId),
			this.expenseRepository.findManyByEventId(eventId),
			this.incomeRepository.findManyByEventId(eventId),
		]);
		const displayNameByUserId = new Map(
			participants.map((participant) => [
				participant.userId,
				participant.displayName,
			]),
		);
		const calculations = finance.categories.map((category) => ({
			categoryId: category.id,
			categoryName: category.name,
			calculation: SettlementCalculator.calculate(
				category,
				expenses.filter((expense) => expense.categoryId === category.id),
				incomes.filter((income) => income.categoryId === category.id),
			),
		}));
		const finalCalculation = FinalRefundCalculator.calculate(
			calculations,
			finance.refundRoundingUnit,
		);
		const resultByUserId = new Map(
			finalCalculation.participants.map((participant) => [
				participant.userId,
				participant,
			]),
		);
		const participantFinanceByUserId = new Map(
			participantFinances.map((participant) => [participant.userId, participant]),
		);
		const zeroAmount = { numerator: 0, denominator: 1, displayAmount: 0 };

		return GetEventSettlementResponseSchema.parse({
			refundRoundingUnit: finance.refundRoundingUnit,
			feeCalculationLockedAt:
				finance.feeCalculationLockedAt?.toISOString() ?? null,
			settlementLockedAt: finance.settlementLockedAt?.toISOString() ?? null,
			refundStartedAt: finance.refundStartedAt?.toISOString() ?? null,
			participants: participants.map(({ userId, displayName }) => {
				const result = resultByUserId.get(userId);
				return {
					userId,
					displayName,
					settlementNote:
						participantFinanceByUserId.get(userId)?.settlementNote ?? null,
					categoryBreakdowns: result?.categoryBreakdowns ?? [],
					unroundedTotal: result?.unroundedTotal ?? zeroAmount,
					proposedRefundAmount: result?.refundAmount ?? 0,
				};
			}),
			categories: finance.categories.map((category) => {
				const categoryExpenses = expenses.filter(
					(expense) => expense.categoryId === category.id,
				);
				const categoryIncomes = incomes.filter(
					(income) => income.categoryId === category.id,
				);
				const calculation = calculations.find(
					(item) => item.categoryId === category.id,
				)?.calculation ?? SettlementCalculator.calculate(category, categoryExpenses, categoryIncomes);
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
