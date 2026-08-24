import type {
	RefundRoundingUnit,
	SettlementCategoryId,
	UserId,
} from "../../schema";
import { RefundRoundingUnitSchema } from "../../schema";
import type {
	RationalAmount,
	SettlementCategoryCalculation,
} from "./settlement-calculator";

export type FinalRefundCategoryInput = {
	categoryId: SettlementCategoryId;
	categoryName: string;
	calculation: SettlementCategoryCalculation;
};

export type FinalRefundParticipantResult = {
	userId: UserId;
	categoryBreakdowns: Array<{
		categoryId: SettlementCategoryId;
		categoryName: string;
		amount: RationalAmount;
	}>;
	unroundedTotal: RationalAmount;
	refundAmount: number;
	roundingDifference: RationalAmount;
};

export type FinalRefundCalculation = {
	participants: FinalRefundParticipantResult[];
	totalUnroundedRefundAmount: number;
	totalRefundAmount: number;
	roundingRemainder: number;
};

// biome-ignore lint/complexity/noStaticOnlyClass: 最終返金規則をまとめるドメインサービス。
export class FinalRefundCalculator {
	static calculate(
		categories: FinalRefundCategoryInput[],
		roundingUnit: RefundRoundingUnit,
	): FinalRefundCalculation {
		RefundRoundingUnitSchema.parse(roundingUnit);
		const breakdownsByUser = new Map<
			UserId,
			FinalRefundParticipantResult["categoryBreakdowns"]
		>();
		for (const category of categories) {
			for (const participant of category.calculation.participantBreakdowns) {
				const breakdowns = breakdownsByUser.get(participant.userId) ?? [];
				breakdowns.push({
					categoryId: category.categoryId,
					categoryName: category.categoryName,
					amount: participant.total,
				});
				breakdownsByUser.set(participant.userId, breakdowns);
			}
		}

		const participants = [...breakdownsByUser.entries()].map(
			([userId, categoryBreakdowns]) => {
				const unroundedTotal = categoryBreakdowns.reduce(
					(sum, item) => FinalRefundCalculator.add(sum, item.amount),
					FinalRefundCalculator.rational(0, 1),
				);
				const refundAmount =
					Math.floor(
						unroundedTotal.numerator /
							(unroundedTotal.denominator * roundingUnit),
					) * roundingUnit;
				const roundingDifference = FinalRefundCalculator.add(
					unroundedTotal,
					FinalRefundCalculator.rational(-refundAmount, 1),
				);
				return {
					userId,
					categoryBreakdowns,
					unroundedTotal,
					refundAmount,
					roundingDifference,
				};
			},
		);
		const totalUnrounded = participants.reduce(
			(sum, participant) =>
				FinalRefundCalculator.add(sum, participant.unroundedTotal),
			FinalRefundCalculator.rational(0, 1),
		);
		if (totalUnrounded.numerator % totalUnrounded.denominator !== 0) {
			throw new Error("イベント全体の返金原資を整数円で計算できません。");
		}
		const totalUnroundedRefundAmount =
			totalUnrounded.numerator / totalUnrounded.denominator;
		const totalRefundAmount = participants.reduce(
			(sum, participant) => sum + participant.refundAmount,
			0,
		);
		return {
			participants,
			totalUnroundedRefundAmount,
			totalRefundAmount,
			roundingRemainder: totalUnroundedRefundAmount - totalRefundAmount,
		};
	}

	private static add(left: RationalAmount, right: RationalAmount) {
		return FinalRefundCalculator.rational(
			left.numerator * right.denominator + right.numerator * left.denominator,
			left.denominator * right.denominator,
		);
	}

	private static rational(
		numerator: number,
		denominator: number,
	): RationalAmount {
		if (
			!Number.isSafeInteger(numerator) ||
			!Number.isSafeInteger(denominator)
		) {
			throw new Error("最終返金額が大きすぎます。");
		}
		const divisor = FinalRefundCalculator.gcd(Math.abs(numerator), denominator);
		const reducedNumerator = numerator / divisor;
		const reducedDenominator = denominator / divisor;
		return {
			numerator: reducedNumerator,
			denominator: reducedDenominator,
			displayAmount: reducedNumerator / reducedDenominator,
		};
	}

	private static gcd(left: number, right: number): number {
		let a = left;
		let b = right;
		while (b !== 0) [a, b] = [b, a % b];
		return a || 1;
	}
}
