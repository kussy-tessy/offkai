import {
	applyLedgerCommand,
	calculateFinanceLedger,
	type FinanceLedger,
	FinanceLedgerSchema,
	type LedgerCommand,
	type LedgerPayment,
	LegacyStaffPermissions,
} from "@offkai/core";
import { describe, expect, it } from "vitest";
import { projectLedger } from "./usecase/offkai-event/finance-ledger/ledger.projection";
import {
	allowsLedger,
	ledgerCommandRequirements,
} from "./usecase/offkai-event/finance-ledger/ledger-permissions";

const at = "2026-09-23T10:00:00.000Z";
const weights = (values = [1, 1, 1]) => ({
	mode: "weights" as const,
	rows: values.map((value, i) => ({ personId: ["a", "b", "c"][i], value })),
});
function fixture(): FinanceLedger {
	return FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: 0,
		roundingUnit: 1,
		people: ["a", "b", "c"].map((id) => ({ id, name: id })),
		categories: [
			{
				id: "day",
				name: "1日目",
				baseAmount: 4000,
				memberIds: ["a", "b", "c"],
			},
		],
		items: [],
		charges: ["a", "b", "c"].map((personId) => ({
			id: `charge-${personId}`,
			personId,
			categoryId: "day",
			title: "参加費",
			amount: 4000,
			confirmed: true,
			note: "",
		})),
		expenses: [
			{
				id: "ferry",
				categoryId: "day",
				itemId: null,
				title: "フェリー",
				amount: 6000,
				kind: "expense",
				allocation: weights([1, 1, 0]),
				payerId: null,
				recipients: [],
				note: "",
			},
			{
				id: "room",
				categoryId: "day",
				itemId: null,
				title: "更衣室",
				amount: 1250,
				kind: "expense",
				allocation: weights([1, 1, 0.5]),
				payerId: null,
				recipients: [],
				note: "",
			},
		],
		incomes: [],
		adjustments: [],
		payments: [],
		snapshot: null,
		migrationNotes: [],
	});
}
function payment(
	kind: LedgerPayment["kind"],
	referenceId: string,
	amount: number,
	id = `${kind}-${referenceId}`,
): LedgerPayment {
	return {
		id,
		kind,
		referenceId,
		amount,
		at,
		note: "",
		migrated: false,
	};
}
const cmd = (body: Record<string, unknown>) =>
	({
		revision: 0,
		requestId: "00000000-0000-4000-8000-000000000001",
		...body,
	}) as LedgerCommand;
const change = (s: FinanceLedger, body: Record<string, unknown>) =>
	applyLedgerCommand(s, cmd(body), "owner", at);
const confirm = (s: FinanceLedger) => change(s, { action: "confirm" });
function collected(s = fixture()) {
	s.payments = s.charges
		.filter((c) => c.amount > 0)
		.map((c) => payment("collection", c.id, c.amount));
	return s;
}
const person = (s: FinanceLedger, id: string) =>
	calculateFinanceLedger(s).participants.find((p) => p.id === id)!;
const donation = (amount: number) => ({
	id: "gift",
	categoryId: "day",
	title: "カンパ",
	amount,
	allocation: weights(),
	note: "",
});
describe("実費配分と差額精算", () => {
	it("受領済み収入の削除は紐づく受領だけをまとめて削除する", () => {
		const s = collected();
		s.incomes.push(donation(10000), { ...donation(300), id: "other" });
		s.payments.push(
			payment("income", "gift", 6000, "first"),
			payment("income", "gift", 4000, "second"),
			payment("income", "other", 300),
		);
		const before = calculateFinanceLedger(s);
		const next = change(s, {
			action: "remove",
			resource: "incomes",
			id: "gift",
		});
		expect(next.incomes.map((i) => i.id)).toEqual(["other"]);
		expect(next.payments).toEqual(
			s.payments.filter((p) => p.referenceId !== "gift"),
		);
		expect(calculateFinanceLedger(next).cash).toBe(before.cash - 10000);
		expect(s.incomes).toHaveLength(2);
		expect(s.payments.filter((p) => p.referenceId === "gift")).toHaveLength(2);
	});
	it("フェリー0・更衣室0.5", () => {
		const r = calculateFinanceLedger(collected());
		expect(r.participants.map((p) => p.cost)).toEqual([3500, 3500, 250]);
		expect(r.participants.map((p) => p.proposedRemaining)).toEqual([
			500, 500, 3750,
		]);
		expect(r.projected).toBe(0);
	});
	it("概算請求が違っても実費負担は同じ", () => {
		const s = fixture();
		s.charges[2].amount = 500;
		collected(s);
		expect(person(s, "c")).toMatchObject({ cost: 250, proposedRemaining: 250 });
	});
	it("未徴収者がいても先行返金できる", () => {
		let s = fixture();
		s.payments = [payment("collection", "charge-c", 4000)];
		s = confirm(s);
		expect(person(s, "a").remaining).toBe(-3500);
		s = change(s, {
			action: "put",
			resource: "payments",
			value: payment("refund", "c", 3750),
		});
		expect(person(s, "c").remaining).toBe(0);
		expect(calculateFinanceLedger(s).cash).toBe(-7000);
	});
	it("先行返金後の宿泊追加を再精算", () => {
		let s = confirm(collected());
		s.payments.push(payment("refund", "c", 3750));
		s = change(s, {
			action: "put",
			resource: "expenses",
			value: {
				...s.expenses[1],
				id: "hotel",
				amount: 3000,
				allocation: weights([0, 0, 1]),
			},
		});
		expect(calculateFinanceLedger(s).stale).toBe(false);
		expect(person(s, "c").remaining).toBe(-3000);
	});
	it("返金後のカンパで差額だけ追加返金", () => {
		let s = collected();
		s.payments.push(payment("refund", "a", 500));
		s = change(s, { action: "put", resource: "incomes", value: donation(900) });
		expect(person(s, "a").remaining).toBe(300);
		s = change(s, {
			action: "put",
			resource: "payments",
			value: payment("refund", "a", 300, "second"),
		});
		expect(person(s, "a").remaining).toBe(0);
	});
	it("800円を8000円に訂正しても架空取引は増えない", () => {
		let s = fixture();
		s.charges[0].amount = 8000;
		s.payments = [payment("collection", "charge-a", 800)];
		s = change(s, {
			action: "put",
			resource: "payments",
			value: { ...s.payments[0], amount: 8000 },
		});
		expect(s.payments).toHaveLength(1);
		expect(person(s, "a").received).toBe(8000);
	});
	it("徴収後の概算減額は実受領額を変えない", () => {
		let s = collected();
		s = change(s, {
			action: "put",
			resource: "charges",
			value: { ...s.charges[2], amount: 500 },
		});
		expect(person(s, "c")).toMatchObject({
			charged: 500,
			received: 4000,
			proposedRemaining: 3750,
		});
	});
	it("入金のある請求の付替え・削除を拒否", () => {
		const s = collected();
		expect(() =>
			change(s, {
				action: "put",
				resource: "charges",
				value: { ...s.charges[0], categoryId: null },
			}),
		).toThrow("対象者・区分");
		expect(() =>
			change(s, { action: "remove", resource: "charges", id: "charge-a" }),
		).toThrow("請求が見つかりません");
	});
	it("誤入金削除で請求は消えない", () => {
		const s = change(collected(), {
			action: "remove",
			resource: "payments",
			id: "collection-charge-a",
		});
		expect(s.charges).toHaveLength(3);
		expect(person(s, "a").received).toBe(0);
	});
	it("帽子代は返金原資に入らない", () => {
		const s = collected();
		s.charges.push({
			id: "hat",
			personId: "a",
			categoryId: null,
			title: "帽子",
			amount: 2000,
			note: "",
			confirmed: true,
		});
		s.payments.push(payment("collection", "hat", 2000));
		expect(person(s, "a").proposedRemaining).toBe(500);
		expect(calculateFinanceLedger(s)).toMatchObject({
			independentCash: 2000,
			projected: 2000,
		});
		s.expenses.push({
			id: "hat-remit",
			categoryId: null,
			itemId: null,
			title: "帽子送金",
			amount: 2000,
			kind: "independent",
			allocation: weights([0, 0, 0]),
			payerId: null,
			recipients: [],
			note: "",
		});
		s.payments.push(payment("expense", "hat-remit", 2000));
		expect(calculateFinanceLedger(s)).toMatchObject({
			independentCash: 0,
			projected: 0,
		});
	});
	it("立替を二重に経費計上しない", () => {
		const s = collected();
		s.expenses[0].payerId = "a";
		expect(person(s, "a")).toMatchObject({
			cost: 3500,
			receivable: 6000,
			proposedRemaining: 6500,
		});
		expect(calculateFinanceLedger(s)).toMatchObject({
			expenseOutstanding: 0,
			projected: 0,
		});
		s.payments.push(payment("expense", "ferry", 6000));
		expect(() => calculateFinanceLedger(s)).toThrow("参加者への精算");
	});
	it("協力金受取人と負担者を分離", () => {
		const s = collected();
		s.expenses.push({
			...s.expenses[0],
			id: "cooperation",
			amount: 1000,
			kind: "cooperation",
			allocation: weights([1, 1, 0]),
			recipients: [{ personId: "c", amount: 1000 }],
		});
		expect(person(s, "c")).toMatchObject({
			cost: 250,
			receivable: 1000,
			proposedRemaining: 4750,
		});
		expect(calculateFinanceLedger(s).projected).toBe(0);
	});
	it("経費保存だけで支出になり、旧支払記録を二重計上しない", () => {
		let s = collected();
		expect(calculateFinanceLedger(s).cash).toBe(4750);
		s.payments.push(payment("expense", "ferry", 6000));
		expect(calculateFinanceLedger(s).cash).toBe(4750);
		s = change(s, {
			action: "put",
			resource: "expenses",
			value: { ...s.expenses[0], amount: 3000 },
		});
		expect(calculateFinanceLedger(s).cash).toBe(7750);
		expect(s.payments.some((p) => p.kind === "expense")).toBe(false);
		s = change(s, { action: "remove", resource: "expenses", id: "ferry" });
		expect(calculateFinanceLedger(s).cash).toBe(10750);
	});
	it("手動調整の二方式を再計算時にも維持", () => {
		const s = collected();
		s.adjustments = [
			{ id: "adjust-a", personId: "a", mode: "delta", amount: 300, note: "" },
			{ id: "adjust-c", personId: "c", mode: "fixed", amount: 2000, note: "" },
		];
		expect(person(s, "a").proposedRefund).toBe(800);
		s.incomes.push(donation(900));
		expect(person(s, "a").proposedRefund).toBe(1100);
		expect(person(s, "c").proposedRefund).toBe(2000);
	});
	it("支払後の減額は要回収", () => {
		let s = collected();
		s.payments.push(payment("refund", "a", 500));
		s.adjustments = [
			{ id: "adjust", personId: "a", mode: "fixed", amount: 200, note: "" },
		];
		s = confirm(s);
		expect(person(s, "a").remaining).toBe(-300);
	});
	it("手動調整二方式の併用を拒否", () => {
		const s = fixture();
		s.adjustments = [
			{ id: "1", personId: "a", mode: "fixed", amount: 200, note: "" },
			{ id: "2", personId: "a", mode: "delta", amount: 100, note: "" },
		];
		expect(() => calculateFinanceLedger(s)).toThrow("1人につき1件");
	});
	it("未配分のまま確定できない", () => {
		const s = fixture();
		s.expenses[0].allocation = weights([0, 0, 0]);
		expect(calculateFinanceLedger(s).unallocated[0].amount).toBe(6000);
		expect(() => confirm(s)).toThrow("未配分");
	});
	it("直接金額指定と総額検証", () => {
		const s = fixture();
		s.expenses[0].allocation = {
			mode: "fixed",
			rows: [
				{ personId: "a", value: 1000 },
				{ personId: "b", value: 5000 },
			],
		};
		expect(person(s, "a").cost).toBe(1500);
		s.expenses[0].allocation.rows[0].value = 1001;
		expect(() => calculateFinanceLedger(s)).toThrow("総額を超え");
	});
	it("均等徴収・均等負担は従来計算と一致", () => {
		const s = collected();
		s.expenses.forEach((e) => {
			e.allocation = weights();
		});
		s.roundingUnit = 10;
		const old = Math.floor((12000 - 7250) / 3 / 10) * 10;
		expect(
			calculateFinanceLedger(s).participants.map((p) => p.proposedRefund),
		).toEqual([old, old, old]);
	});
	it("費目ごとに丸めない", () => {
		const s = fixture();
		s.expenses = [1, 2, 3].map((i) => ({
			...s.expenses[0],
			id: `e${i}`,
			amount: 1,
			allocation: weights(),
		}));
		s.charges.forEach((c) => {
			c.amount = 10;
		});
		expect(
			calculateFinanceLedger(s).participants.map((p) => p.proposedRefund),
		).toEqual([9, 9, 9]);
	});
	it("追加精算で端数を二重配分しない", () => {
		let s = collected();
		s.roundingUnit = 10;
		s = confirm(s);
		s.payments.push(payment("refund", "a", 500));
		s.incomes.push(donation(1));
		s = confirm(s);
		expect(person(s, "a").remaining).toBe(0);
		s.incomes[0].amount = 30;
		s = confirm(s);
		expect(person(s, "a").remaining).toBe(10);
	});
	it("新規返金は確定残額を超えられない", () => {
		expect(() =>
			change(confirm(collected()), {
				action: "put",
				resource: "payments",
				value: payment("refund", "a", 501),
			}),
		).toThrow("残額を超え");
	});
	it("旧確定額にかかわらず最新の計算を採用", () => {
		const s = collected();
		s.snapshot = {
			at,
			actorId: "legacy",
			inputRevision: -1,
			targets: { a: 3000, b: 3000, c: 3000 },
			migrated: true,
		};
		expect(person(s, "a")).toMatchObject({
			remaining: 500,
			proposedRemaining: 500,
		});
		expect(calculateFinanceLedger(s).stale).toBe(false);
	});
	it("一括請求で個別金額を上書きしない", () => {
		let s = fixture();
		s.charges = s.charges.slice(0, 1);
		s.charges[0].amount = 1000;
		s.charges[0].isBase = true;
		s = change(s, { action: "createCategoryCharges", categoryId: "day" });
		expect(s.charges.map((c) => c.amount)).toEqual([1000, 4000, 4000]);
	});
	it("区分更新が保存済み経費配分を変えない", () => {
		const s = fixture();
		const next = change(s, {
			action: "put",
			resource: "categories",
			value: { ...s.categories[0], memberIds: ["a"] },
		});
		expect(next.expenses).toEqual(s.expenses);
		expect(next.people).toHaveLength(3);
	});
});
describe("スタッフ権限", () => {
	const base = {
		...LegacyStaffPermissions,
		feeCalculation: "none" as const,
		feeCollection: "none" as const,
		settlement: "none" as const,
		refund: "none" as const,
	};
	it("一般入出金は経費編集", () => {
		for (const kind of ["income", "expense"] as const)
			expect(
				ledgerCommandRequirements(
					fixture(),
					cmd({
						action: "put",
						resource: "payments",
						value: payment(kind, "x", 1),
					}),
				),
			).toEqual([{ area: "settlement", level: "edit" }]);
	});
	it("参加者への支払いと追加徴収の権限を分離", () => {
		expect(
			ledgerCommandRequirements(
				fixture(),
				cmd({
					action: "put",
					resource: "payments",
					value: payment("refund", "a", 1),
				}),
			),
		).toEqual([{ area: "refund", level: "record" }]);
		expect(
			ledgerCommandRequirements(
				fixture(),
				cmd({
					action: "put",
					resource: "payments",
					value: payment("recovery", "a", 1),
				}),
			),
		).toEqual([{ area: "feeCollection", level: "record" }]);
	});
	it("既存記録の種類偽装でも元の権限が必要", () => {
		const s = fixture();
		s.payments = [payment("refund", "a", 100, "same")];
		const r = ledgerCommandRequirements(
			s,
			cmd({
				action: "put",
				resource: "payments",
				value: payment("collection", "charge-a", 100, "same"),
			}),
		);
		expect(r).toContainEqual({ area: "refund", level: "record" });
		expect(r).toContainEqual({ area: "feeCollection", level: "record" });
	});
	it("編集権限だけでは確定不可", () => {
		expect(
			allowsLedger(
				{ owner: false, permissions: { ...base, settlement: "edit" } },
				ledgerCommandRequirements(fixture(), cmd({ action: "confirm" }))[0],
			),
		).toBe(false);
	});
	it("徴収担当には経費内訳・資金残高を返さない", () => {
		const s = collected();
		s.payments.push(payment("expense", "ferry", 6000));
		const p = projectLedger(s, 1, true, {
			owner: false,
			permissions: { ...base, feeCollection: "record" },
		});
		expect(p.state.expenses).toEqual([]);
		expect(p.calculation.cash).toBeNull();
		expect(p.calculation.participants[0].breakdowns).toEqual([]);
		expect(p.state.payments).toHaveLength(3);
	});
	it("返金担当には請求・一般入出金を返さない", () => {
		const s = confirm(collected());
		s.charges.push({
			id: "hat-unpaid",
			personId: "a",
			categoryId: null,
			title: "帽子",
			amount: 1000,
			confirmed: true,
			note: "",
		});
		s.charges.push({
			id: "hat-overpaid",
			personId: "a",
			categoryId: null,
			title: "別の品物",
			amount: 500,
			confirmed: true,
			note: "",
		});
		s.payments.push(payment("collection", "hat-overpaid", 1500));
		s.payments.push(payment("refund", "a", 100));
		const p = projectLedger(s, 1, true, {
			owner: false,
			permissions: { ...base, refund: "record" },
		});
		expect(p.state.charges).toEqual([]);
		expect(p.state.payments).toHaveLength(1);
		expect(p.calculation.participants[0].remaining).toBe(400);
		expect(p.calculation.participants[0].independentUncollected).toBe(1000);
		expect(p.calculation.participants[0].independentOvercollected).toBe(1000);
		expect(p.calculation.participants[0].independentOutstanding).toBe(0);
	});
});

it.each([
	"expenses",
	"incomes",
] as const)("%s の直接指定は明細額との一致が必要", (resource) => {
	const state = fixture();
	const value =
		resource === "expenses"
			? { ...state.expenses[0] }
			: {
					id: "gift",
					categoryId: "day",
					title: "カンパ",
					amount: 6000,
					note: "",
				};
	for (const total of [5000, 7000]) {
		expect(() =>
			change(state, {
				action: "put",
				resource,
				value: {
					...value,
					allocation: {
						mode: "fixed",
						rows: [{ personId: "a", value: total }],
					},
				},
			}),
		).toThrow(/配分/);
	}
	expect(() =>
		change(state, {
			action: "put",
			resource,
			value: {
				...value,
				allocation: { mode: "fixed", rows: [{ personId: "a", value: 6000 }] },
			},
		}),
	).not.toThrow();
});
