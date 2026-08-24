import { v7 as uuidv7 } from "uuid";
import type {
	PaymentAmount,
	SettlementCategoryId,
	SettlementExpenseId,
	UserId,
} from "../../schema";
import {
	SettlementCategoryIdSchema,
	SettlementExpenseIdSchema,
} from "../../schema";
import { MoneyAmount } from "./money-amount";
export type SettlementExpenseRecipient = {
	userId: UserId;
	amount: PaymentAmount;
};

export class SettlementExpense {
	private constructor(
		readonly id: SettlementExpenseId,
		readonly categoryId: SettlementCategoryId,
		readonly title: string,
		readonly amount: PaymentAmount,
		readonly note: string | null,
		readonly recipients: SettlementExpenseRecipient[],
	) {}

	static create(params: {
		categoryId: SettlementCategoryId;
		title: string;
		amount: number | null;
		note: string | null;
		recipients: Array<{ userId: UserId; amount: number }>;
	}): SettlementExpense {
		return SettlementExpense.build({
			...params,
			id: SettlementExpenseIdSchema.parse(uuidv7()),
		});
	}

	static reconstruct(params: {
		id: SettlementExpenseId;
		categoryId: SettlementCategoryId;
		title: string;
		amount: number;
		note: string | null;
		recipients: Array<{ userId: UserId; amount: number }>;
	}): SettlementExpense {
		return SettlementExpense.build(params, params.amount);
	}

	edit(params: {
		title: string;
		amount: number | null;
		note: string | null;
		recipients: Array<{ userId: UserId; amount: number }>;
	}): SettlementExpense {
		return SettlementExpense.build({
			...params,
			id: this.id,
			categoryId: this.categoryId,
		});
	}

	get hasRecipients(): boolean {
		return this.recipients.length > 0;
	}

	private static build(
		params: {
			id: SettlementExpenseId;
			categoryId: SettlementCategoryId;
			title: string;
			amount: number | null;
			note: string | null;
			recipients: Array<{ userId: UserId; amount: number }>;
		},
		persistedAmount?: number,
	): SettlementExpense {
		const title = params.title.trim();
		if (!title) throw new Error("経費の内容を入力してください。");
		if (
			new Set(params.recipients.map((item) => item.userId)).size !==
			params.recipients.length
		) {
			throw new Error("同じ受取人を重複して登録できません。");
		}
		const recipients = params.recipients.map((recipient) => {
			const amount = MoneyAmount.from(recipient.amount).value;
			if (amount === 0)
				throw new Error("受取人の金額は1円以上にしてください。");
			return { ...recipient, amount };
		});
		if (new Set(recipients.map((recipient) => recipient.amount)).size > 1) {
			throw new Error("協力金はすべての受取人に同じ金額を設定してください。");
		}
		const amount =
			recipients.length > 0
				? recipients.reduce(
						(sum, recipient) => sum.add(MoneyAmount.from(recipient.amount)),
						MoneyAmount.from(0),
					).value
				: MoneyAmount.from(params.amount ?? 0).value;
		if (amount === 0) throw new Error("経費の金額は1円以上にしてください。");
		if (persistedAmount !== undefined && persistedAmount !== amount) {
			throw new Error("経費合計と受取人別金額の合計が一致しません。");
		}
		return new SettlementExpense(
			SettlementExpenseIdSchema.parse(params.id),
			SettlementCategoryIdSchema.parse(params.categoryId),
			title,
			amount,
			params.note?.trim() || null,
			recipients,
		);
	}
}
