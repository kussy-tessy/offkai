export function formatAmount(amount: number | null): string {
	return amount === null
		? "—"
		: amount.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}
export const yen = (amount: number | null) =>
	amount === null ? "—" : `${formatAmount(amount)}円`;
export const balanceText = (amount: number) =>
	amount > 0
		? `返金 ${yen(amount)}`
		: amount < 0
			? `追加徴収 ${yen(-amount)}`
			: "精算済み";
export const paymentLabel = (kind: string) =>
	({
		collection: "請求の徴収",
		recovery: "追加徴収",
		refund: "精算金の返金",
		expense: "経費等支払い",
		income: "その他収入",
	})[kind] ?? kind;
