import { v7 as uuidv7 } from "uuid";
import type { ExtraChargeId, PaymentAmount, UserId } from "../../schema";
import { ExtraChargeIdSchema } from "../../schema";
import { MoneyAmount } from "./money-amount";
export type ExtraCharge = {
	id: ExtraChargeId;
	title: string;
	amount: PaymentAmount;
	note: string | null;
};

export class ParticipantFinance {
	private constructor(
		readonly userId: UserId,
		readonly note: string | null,
		readonly extraCharges: ExtraCharge[],
		readonly chargeAmount: PaymentAmount,
		readonly collectedAt: Date | null,
		readonly refundAmount: PaymentAmount | null,
		readonly refundCalculatedAt: Date | null,
		readonly refundedAt: Date | null,
	) {}

	static reconstruct(params: {
		userId: UserId;
		note: string | null;
		extraCharges: ExtraCharge[];
		chargeAmount: number;
		collectedAt?: Date | null;
		refundAmount?: number | null;
		refundCalculatedAt?: Date | null;
		refundedAt?: Date | null;
	}): ParticipantFinance {
		return new ParticipantFinance(
			params.userId,
			params.note,
			params.extraCharges.map(ParticipantFinance.validateExtraCharge),
			MoneyAmount.from(params.chargeAmount).value,
			params.collectedAt ?? null,
			params.refundAmount === null || params.refundAmount === undefined
				? null
				: MoneyAmount.from(params.refundAmount).value,
			params.refundCalculatedAt ?? null,
			params.refundedAt ?? null,
		);
	}

	static calculate(params: {
		userId: UserId;
		note: string | null;
		categoryAmounts: number[];
		extraCharges: ExtraCharge[];
		collectedAt?: Date | null;
		refundAmount?: number | null;
		refundCalculatedAt?: Date | null;
		refundedAt?: Date | null;
	}): ParticipantFinance {
		const charges = params.extraCharges.map(
			ParticipantFinance.validateExtraCharge,
		);
		const total = [
			...params.categoryAmounts,
			...charges.map((item) => item.amount),
		]
			.map(MoneyAmount.from)
			.reduce((sum, amount) => sum.add(amount), MoneyAmount.from(0));
		return new ParticipantFinance(
			params.userId,
			params.note,
			charges,
			total.value,
			params.collectedAt ?? null,
			params.refundAmount === null || params.refundAmount === undefined
				? null
				: MoneyAmount.from(params.refundAmount).value,
			params.refundCalculatedAt ?? null,
			params.refundedAt ?? null,
		);
	}

	setRefundCalculation(amount: number, at: Date): ParticipantFinance {
		if (this.refundedAt) throw new Error("返金済みの返金額は変更できません。");
		if (Number.isNaN(at.getTime())) throw new Error("返金計算日時が不正です。");
		return ParticipantFinance.reconstruct({
			...this,
			refundAmount: MoneyAmount.from(amount).value,
			refundCalculatedAt: at,
		});
	}

	clearRefundCalculation(): ParticipantFinance {
		if (this.refundedAt) throw new Error("返金済みの返金額は削除できません。");
		return ParticipantFinance.reconstruct({
			...this,
			refundAmount: null,
			refundCalculatedAt: null,
		});
	}

	markRefunded(at: Date): ParticipantFinance {
		if (this.refundAmount === null)
			throw new Error("返金額を計算してから返金してください。");
		if (this.refundAmount === 0) throw new Error("返金額が0円の参加者です。");
		if (Number.isNaN(at.getTime())) throw new Error("返金日時が不正です。");
		return ParticipantFinance.reconstruct({ ...this, refundedAt: at });
	}

	markUnrefunded(): ParticipantFinance {
		return ParticipantFinance.reconstruct({ ...this, refundedAt: null });
	}

	markCollected(at: Date): ParticipantFinance {
		if (Number.isNaN(at.getTime())) throw new Error("徴収日時が不正です。");
		return ParticipantFinance.reconstruct({ ...this, collectedAt: at });
	}

	markUncollected(): ParticipantFinance {
		return ParticipantFinance.reconstruct({ ...this, collectedAt: null });
	}

	static createExtraCharge(params: {
		title: string;
		amount: number;
		note: string | null;
	}): ExtraCharge {
		return ParticipantFinance.validateExtraCharge({
			id: ExtraChargeIdSchema.parse(uuidv7()),
			title: params.title,
			amount: MoneyAmount.from(params.amount).value,
			note: params.note,
		});
	}

	changeNote(note: string | null): ParticipantFinance {
		return ParticipantFinance.reconstruct({ ...this, note });
	}

	addExtraCharge(params: {
		title: string;
		amount: number;
		note: string | null;
	}): ParticipantFinance {
		return ParticipantFinance.reconstruct({
			...this,
			extraCharges: [
				...this.extraCharges,
				ParticipantFinance.createExtraCharge(params),
			],
		});
	}

	editExtraCharge(
		id: ExtraChargeId,
		params: { title: string; amount: number; note: string | null },
	): ParticipantFinance {
		if (!this.extraCharges.some((charge) => charge.id === id)) {
			throw new Error("追加請求が見つかりません。");
		}
		return ParticipantFinance.reconstruct({
			...this,
			extraCharges: this.extraCharges.map((charge) =>
				charge.id === id
					? ParticipantFinance.updateExtraCharge(id, params)
					: charge,
			),
		});
	}

	removeExtraCharge(id: ExtraChargeId): ParticipantFinance {
		if (!this.extraCharges.some((charge) => charge.id === id)) {
			throw new Error("追加請求が見つかりません。");
		}
		return ParticipantFinance.reconstruct({
			...this,
			extraCharges: this.extraCharges.filter((charge) => charge.id !== id),
		});
	}

	static updateExtraCharge(
		id: ExtraChargeId,
		params: { title: string; amount: number; note: string | null },
	): ExtraCharge {
		return ParticipantFinance.validateExtraCharge({
			id,
			title: params.title,
			amount: MoneyAmount.from(params.amount).value,
			note: params.note,
		});
	}

	private static validateExtraCharge(charge: ExtraCharge): ExtraCharge {
		const title = charge.title.trim();
		if (title.length === 0)
			throw new Error("追加請求の内容を入力してください。");
		return {
			id: ExtraChargeIdSchema.parse(charge.id),
			title,
			amount: MoneyAmount.from(charge.amount).value,
			note: charge.note,
		};
	}
}
