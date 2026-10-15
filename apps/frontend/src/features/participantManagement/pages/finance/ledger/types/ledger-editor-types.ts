import type { LedgerPage, LedgerPayment } from "@offkai/core";
export type LedgerEditorProps = {
	page: LedgerPage;
	value?: unknown;
	busy: boolean;
	error: string;
	initialPersonId?: string;
	initialPaymentKind?: LedgerPayment["kind"];
	initialCategoryId?: string | null;
	initialReferenceId?: string;
};
export type LedgerEditorEvents = {
	close: [];
	removeAdjustment: [id: string];
	save: [value: unknown, payment?: LedgerPayment, receiptFiles?: File[]];
};
