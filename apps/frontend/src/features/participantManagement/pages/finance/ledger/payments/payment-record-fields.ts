import type { LedgerPayment } from "@offkai/core";
export function localDate(date: Date) {
	return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 16);
}
export function newPaymentFields() {
	return {
		payNow: false,
		localAt: localDate(new Date()),
	};
}
export type PaymentRecordFields = ReturnType<typeof newPaymentFields>;
export function immediatePayment(
	fields: PaymentRecordFields,
	referenceId: string,
	amount: number,
	kind: "expense" | "income",
): LedgerPayment | undefined {
	if (!fields.payNow) return undefined;
	return {
		id: crypto.randomUUID(),
		kind,
		referenceId,
		amount,
		at: new Date(fields.localAt).toISOString(),
		note: "明細と同時に記録",
		migrated: false,
	};
}
