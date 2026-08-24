import type { PaymentAmount, RefundRoundingUnit } from "../../schema";
import { PaymentAmountSchema, RefundRoundingUnitSchema } from "../../schema";
export class MoneyAmount {
	private constructor(readonly value: PaymentAmount) {}

	static from(value: number): MoneyAmount {
		return new MoneyAmount(PaymentAmountSchema.parse(value));
	}

	add(other: MoneyAmount): MoneyAmount {
		return MoneyAmount.from(this.value + other.value);
	}

	roundDown(unit: RefundRoundingUnit): MoneyAmount {
		RefundRoundingUnitSchema.parse(unit);
		return MoneyAmount.from(Math.floor(this.value / unit) * unit);
	}
}
