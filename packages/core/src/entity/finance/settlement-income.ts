import { v7 as uuidv7 } from "uuid";
import type {
	PaymentAmount,
	SettlementCategoryId,
	SettlementIncomeId,
} from "../../schema";
import {
	SettlementCategoryIdSchema,
	SettlementIncomeIdSchema,
} from "../../schema";
import { MoneyAmount } from "./money-amount";
export class SettlementIncome {
	private constructor(
		readonly id: SettlementIncomeId,
		readonly categoryId: SettlementCategoryId,
		readonly title: string,
		readonly amount: PaymentAmount,
		readonly note: string | null,
	) {}

	static create(params: {
		categoryId: SettlementCategoryId;
		title: string;
		amount: number;
		note: string | null;
	}): SettlementIncome {
		return SettlementIncome.build({
			...params,
			id: SettlementIncomeIdSchema.parse(uuidv7()),
		});
	}

	static reconstruct(params: {
		id: SettlementIncomeId;
		categoryId: SettlementCategoryId;
		title: string;
		amount: number;
		note: string | null;
	}): SettlementIncome {
		return SettlementIncome.build(params);
	}

	edit(params: {
		title: string;
		amount: number;
		note: string | null;
	}): SettlementIncome {
		return SettlementIncome.build({
			...params,
			id: this.id,
			categoryId: this.categoryId,
		});
	}

	private static build(params: {
		id: SettlementIncomeId;
		categoryId: SettlementCategoryId;
		title: string;
		amount: number;
		note: string | null;
	}): SettlementIncome {
		const title = params.title.trim();
		if (!title) throw new Error("収入の内容を入力してください。");
		const amount = MoneyAmount.from(params.amount).value;
		if (amount === 0) throw new Error("収入の金額は1円以上にしてください。");
		return new SettlementIncome(
			SettlementIncomeIdSchema.parse(params.id),
			SettlementCategoryIdSchema.parse(params.categoryId),
			title,
			amount,
			params.note?.trim() || null,
		);
	}
}
