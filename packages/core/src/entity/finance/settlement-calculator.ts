import type { PaymentAmount, UserId } from "../../schema";
import { MoneyAmount } from "./money-amount";
import { SettlementCategory } from "./settlement-category";
import { SettlementExpense } from "./settlement-expense";
import { SettlementIncome } from "./settlement-income";
export type RationalAmount = {
	numerator: number;
	denominator: number;
	displayAmount: number;
};

export type SettlementParticipantCalculation = {
	userId: UserId;
	isCategoryMember: boolean;
	commonRefund: RationalAmount | null;
	recipientAmount: PaymentAmount;
	total: RationalAmount;
};

export type SettlementCategoryCalculation = {
	participantFeeIncome: PaymentAmount;
	additionalIncomeTotal: PaymentAmount;
	totalIncome: PaymentAmount;
	normalExpenseTotal: PaymentAmount;
	recipientExpenseTotal: PaymentAmount;
	commonRefundPool: number;
	memberCount: number;
	participantBreakdowns: SettlementParticipantCalculation[];
};

// biome-ignore lint/complexity/noStaticOnlyClass: 計算規則をドメインサービスとしてまとめる。
export class SettlementCalculator {
	static calculate(
		category: SettlementCategory,
		expenses: SettlementExpense[],
		incomes: SettlementIncome[] = [],
	): SettlementCategoryCalculation {
		if (expenses.some((expense) => expense.categoryId !== category.id)) {
			throw new Error("異なる精算区分の経費を計算できません。");
		}
		if (incomes.some((income) => income.categoryId !== category.id)) {
			throw new Error("異なる精算区分の収入を計算できません。");
		}
		const participantFeeIncome = category.members.reduce(
			(sum, member) =>
				sum.add(MoneyAmount.from(category.amountFor(member.userId) ?? 0)),
			MoneyAmount.from(0),
		).value;
		const additionalIncomeTotal = SettlementCalculator.sumAmounts(
			incomes.map((income) => income.amount),
		);
		const totalIncome = MoneyAmount.from(participantFeeIncome).add(
			MoneyAmount.from(additionalIncomeTotal),
		).value;
		const normalExpenseTotal = SettlementCalculator.sumAmounts(
			expenses
				.filter((expense) => !expense.hasRecipients)
				.map((expense) => expense.amount),
		);
		const recipientExpenseTotal = SettlementCalculator.sumAmounts(
			expenses
				.filter((expense) => expense.hasRecipients)
				.map((expense) => expense.amount),
		);
		const commonRefundPool =
			totalIncome - normalExpenseTotal - recipientExpenseTotal;
		if (!Number.isSafeInteger(commonRefundPool))
			throw new Error("精算金額が大きすぎます。");

		const recipientAmounts = new Map<UserId, PaymentAmount>();
		for (const expense of expenses) {
			for (const recipient of expense.recipients) {
				const current =
					recipientAmounts.get(recipient.userId) ?? MoneyAmount.from(0).value;
				recipientAmounts.set(
					recipient.userId,
					MoneyAmount.from(current).add(MoneyAmount.from(recipient.amount))
						.value,
				);
			}
		}
		const memberIds = category.members.map((member) => member.userId);
		const participantIds = [
			...memberIds,
			...[...recipientAmounts.keys()].filter(
				(userId) => !memberIds.includes(userId),
			),
		];
		const memberCount = memberIds.length;
		return {
			participantFeeIncome,
			additionalIncomeTotal,
			totalIncome,
			normalExpenseTotal,
			recipientExpenseTotal,
			commonRefundPool,
			memberCount,
			participantBreakdowns: participantIds.map((userId) => {
				const isCategoryMember = memberIds.includes(userId);
				const recipientAmount =
					recipientAmounts.get(userId) ?? MoneyAmount.from(0).value;
				const commonRefund =
					isCategoryMember && memberCount > 0
						? SettlementCalculator.rational(commonRefundPool, memberCount)
						: null;
				const total =
					isCategoryMember && memberCount > 0
						? SettlementCalculator.rational(
								commonRefundPool + recipientAmount * memberCount,
								memberCount,
							)
						: SettlementCalculator.rational(recipientAmount, 1);
				return {
					userId,
					isCategoryMember,
					commonRefund,
					recipientAmount,
					total,
				};
			}),
		};
	}

	private static sumAmounts(amounts: number[]): PaymentAmount {
		return amounts.reduce(
			(sum, amount) => sum.add(MoneyAmount.from(amount)),
			MoneyAmount.from(0),
		).value;
	}

	private static rational(
		numerator: number,
		denominator: number,
	): RationalAmount {
		if (
			!Number.isSafeInteger(numerator) ||
			!Number.isSafeInteger(denominator) ||
			denominator <= 0
		) {
			throw new Error("精算金額を正確に計算できません。");
		}
		return { numerator, denominator, displayAmount: numerator / denominator };
	}
}
