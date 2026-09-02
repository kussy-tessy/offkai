import {
	FinalRefundCalculator,
	type GetEventRefundResponse,
	GetEventRefundResponseSchema,
	type OffkaiEventId,
	type RationalAmount,
	SettlementCalculator,
	type Unbrand,
} from "@offkai/core";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	SettlementExpenseRepository,
	SettlementIncomeRepository,
	prisma,
} from "../repository";

const zeroAmount = (): RationalAmount => ({
	numerator: 0,
	denominator: 1,
	displayAmount: 0,
});

export class RefundPageAssembler {
	constructor(
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly participantRepository = new ParticipantFinanceRepository(),
		private readonly expenseRepository = new SettlementExpenseRepository(),
		private readonly incomeRepository = new SettlementIncomeRepository(),
	) {}

	async build(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		const [finance, respondents, participantFinances, expenses, incomes] =
			await Promise.all([
				this.financeRepository.findByEventId(eventId),
				this.eventRepository.findParticipantsByEventId(eventId),
				this.participantRepository.findManyByEventId(eventId),
				this.expenseRepository.findManyByEventId(eventId),
				this.incomeRepository.findManyByEventId(eventId),
			]);
		const finalCalculation = FinalRefundCalculator.calculate(
			finance.categories.map((category) => ({
				categoryId: category.id,
				categoryName: category.name,
				calculation: SettlementCalculator.calculate(
					category,
					expenses.filter((expense) => expense.categoryId === category.id),
					incomes.filter((income) => income.categoryId === category.id),
				),
			})),
			finance.refundRoundingUnit,
		);
		const resultByUserId = new Map(
			finalCalculation.participants.map((participant) => [
				participant.userId,
				participant,
			]),
		);
		const financeByUserId = new Map(
			participantFinances.map((participant) => [
				participant.userId,
				participant,
			]),
		);
		const refunderIds = participantFinances
			.map((participant) => participant.refundedByUserId)
			.filter((value): value is NonNullable<typeof value> => value !== null);
		const refunders = await prisma.user.findMany({
			where: { id: { in: refunderIds } },
			select: { id: true, name: true },
		});
		const refunderNameById = new Map(
			refunders.map((refunder) => [refunder.id, refunder.name]),
		);
		const participants = respondents.map((respondent) => {
			const result = resultByUserId.get(respondent.userId);
			const participant = financeByUserId.get(respondent.userId);
			return {
				userId: respondent.userId,
				displayName: respondent.displayName,
				categoryBreakdowns: result?.categoryBreakdowns ?? [],
				unroundedTotal: result?.unroundedTotal ?? zeroAmount(),
				proposedRefundAmount: result?.refundAmount ?? 0,
				roundingDifference: result?.roundingDifference ?? zeroAmount(),
				refundAmount: participant?.refundAmount ?? null,
				refundedAt: participant?.refundedAt?.toISOString() ?? null,
				refundedByName: participant?.refundedByUserId
					? refunderNameById.get(participant.refundedByUserId) ?? null
					: null,
				settlementNote: participant?.settlementNote ?? null,
				refundNote: participant?.refundNote ?? null,
			};
		});
		const negativeParticipantNames = participants
			.filter((participant) => participant.proposedRefundAmount < 0)
			.map((participant) => participant.displayName);
		const allCalculated = participants.every(
			(participant) => participant.refundAmount !== null,
		);
		const calculatedDates = participantFinances
			.map((participant) => participant.refundCalculatedAt)
			.filter((value): value is Date => value !== null);

		return GetEventRefundResponseSchema.parse({
			refundRoundingUnit: finance.refundRoundingUnit,
			settlementLockedAt: finance.settlementLockedAt?.toISOString() ?? null,
			refundStartedAt: finance.refundStartedAt?.toISOString() ?? null,
			refundCalculatedAt:
				allCalculated && calculatedDates.length > 0
					? new Date(
							Math.max(...calculatedDates.map((date) => date.getTime())),
						).toISOString()
					: null,
			canCalculate:
				finance.feeCalculationLockedAt !== null &&
				finance.settlementLockedAt === null &&
				negativeParticipantNames.length === 0,
			negativeParticipantNames,
			totalUnroundedRefundAmount: finalCalculation.totalUnroundedRefundAmount,
			proposedTotalRefundAmount: finalCalculation.totalRefundAmount,
			totalRefundAmount: allCalculated
				? participants.reduce(
						(sum, participant) => sum + (participant.refundAmount ?? 0),
						0,
					)
				: null,
			roundingRemainder: finalCalculation.roundingRemainder,
			participants,
		});
	}
}
