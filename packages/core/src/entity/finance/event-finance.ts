import type {
	OffkaiEventId,
	RefundRoundingUnit,
	SettlementCategoryId,
} from "../../schema";
import { RefundRoundingUnitSchema } from "../../schema";
import { SettlementCategory } from "./settlement-category";
export class EventFinance {
	private constructor(
		readonly eventId: OffkaiEventId,
		readonly refundRoundingUnit: RefundRoundingUnit,
		readonly categories: SettlementCategory[],
		readonly feeCalculationLockedAt: Date | null,
		readonly collectionStartedAt: Date | null,
		readonly refundLockedAt: Date | null,
	) {}

	static reconstruct(params: {
		eventId: OffkaiEventId;
		refundRoundingUnit: RefundRoundingUnit;
		categories: SettlementCategory[];
		feeCalculationLockedAt?: Date | null;
		collectionStartedAt?: Date | null;
		refundLockedAt?: Date | null;
	}): EventFinance {
		RefundRoundingUnitSchema.parse(params.refundRoundingUnit);
		EventFinance.assertUniqueCategoryNames(params.categories);
		if (
			params.categories.some((category) => category.eventId !== params.eventId)
		) {
			throw new Error("異なるイベントの精算区分を登録できません。");
		}
		return new EventFinance(
			params.eventId,
			params.refundRoundingUnit,
			params.categories,
			params.feeCalculationLockedAt ?? null,
			params.collectionStartedAt ?? null,
			params.refundLockedAt ?? null,
		);
	}

	static create(eventId: OffkaiEventId): EventFinance {
		return EventFinance.reconstruct({
			eventId,
			refundRoundingUnit: 10,
			categories: [],
			feeCalculationLockedAt: null,
			collectionStartedAt: null,
			refundLockedAt: null,
		});
	}

	lockFeeCalculation(at: Date): EventFinance {
		if (this.feeCalculationLockedAt)
			throw new Error("参加費はすでに確定されています。");
		if (Number.isNaN(at.getTime()))
			throw new Error("参加費の確定日時が不正です。");
		return EventFinance.reconstruct({ ...this, feeCalculationLockedAt: at });
	}

	unlockFeeCalculation(): EventFinance {
		if (!this.feeCalculationLockedAt)
			throw new Error("参加費は確定されていません。");
		if (this.collectionStartedAt)
			throw new Error("徴収を開始した参加費は確定解除できません。");
		return EventFinance.reconstruct({ ...this, feeCalculationLockedAt: null });
	}

	markCollectionStarted(at: Date): EventFinance {
		if (!this.feeCalculationLockedAt)
			throw new Error("参加費を確定してから徴収してください。");
		if (this.collectionStartedAt) return this;
		if (Number.isNaN(at.getTime())) throw new Error("徴収開始日時が不正です。");
		return EventFinance.reconstruct({ ...this, collectionStartedAt: at });
	}

	lockRefund(at: Date): EventFinance {
		if (this.refundLockedAt) return this;
		if (Number.isNaN(at.getTime())) throw new Error("返金開始日時が不正です。");
		return EventFinance.reconstruct({ ...this, refundLockedAt: at });
	}

	changeRoundingUnit(unit: RefundRoundingUnit): EventFinance {
		return EventFinance.reconstruct({ ...this, refundRoundingUnit: unit });
	}

	addCategory(category: SettlementCategory): EventFinance {
		return EventFinance.reconstruct({
			...this,
			categories: [...this.categories, category],
		});
	}

	replaceCategory(category: SettlementCategory): EventFinance {
		if (!this.categories.some((item) => item.id === category.id)) {
			throw new Error("精算区分が見つかりません。");
		}
		return EventFinance.reconstruct({
			...this,
			categories: this.categories.map((item) =>
				item.id === category.id ? category : item,
			),
		});
	}

	removeCategory(categoryId: SettlementCategoryId): EventFinance {
		const category = this.categories.find((item) => item.id === categoryId);
		if (!category) throw new Error("精算区分が見つかりません。");
		if (category.members.length > 0) {
			throw new Error("参加者が登録されている精算区分は削除できません。");
		}
		return EventFinance.reconstruct({
			...this,
			categories: this.categories.filter((item) => item.id !== categoryId),
		});
	}

	private static assertUniqueCategoryNames(categories: SettlementCategory[]) {
		const names = categories.map((category) => category.name);
		if (new Set(names).size !== names.length) {
			throw new Error("同じ名前の精算区分を複数登録できません。");
		}
	}
}
