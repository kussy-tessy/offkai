import {
	applyLedgerCommand,
	calculateFinanceLedger,
	type FinanceLedger,
	FinanceLedgerSchema,
	getPlannedCollection,
	type LedgerCommand,
	syncBasicCharges,
} from "@offkai/core";
import { describe, expect, it } from "vitest";
import { syncFinanceSources } from "./ledger.sources";

const at = "2026-09-30T00:00:00.000Z";
const source = (ids = ["a", "b"], archived = false) => ({
	people: [
		{ id: "a", name: "A" },
		{ id: "b", name: "B" },
	],
	questions: [{ id: "day", label: "土泊", personIds: ids, archived }],
});
const fixture = () => {
	const s = FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: 0,
		roundingUnit: 1,
		people: [],
		categories: [],
		items: [],
		charges: [],
		expenses: [],
		incomes: [],
		adjustments: [],
		payments: [],
		snapshot: null,
		migrationNotes: [],
	});
	syncFinanceSources(s, source());
	s.categories[0].baseAmount = 10000;
	syncBasicCharges(s);
	return s;
};
const command = (s: FinanceLedger, extra: object) =>
	applyLedgerCommand(
		s,
		{
			revision: 0,
			requestId: "00000000-0000-4000-8000-000000000001",
			...extra,
		} as LedgerCommand,
		"owner",
		at,
	);
const edit = (s: FinanceLedger, amountOverride: number | null) =>
	command(s, {
		action: "participantCharges",
		personId: "a",
		baseChanges: [{ categoryId: "day", amountOverride, note: "調整" }],
		extras: [],
	});

describe("基本請求の自動反映と回答連動", () => {
	it("回答した人の基本請求を即作成し、再同期しても増殖しない", () => {
		const s = fixture();
		expect(s.charges).toHaveLength(2);
		expect(s.charges.map((c) => c.amount)).toEqual([10000, 10000]);
		expect(syncFinanceSources(s, source())).toBe(false);
		expect(s.charges).toHaveLength(2);
	});
	it("基本金額に追従し、個別指定は同額や0でも維持する", () => {
		for (const value of [10000, 0, 8000]) {
			let s = edit(fixture(), value);
			s = command(s, {
				action: "put",
				resource: "categories",
				value: { ...s.categories[0], baseAmount: 5000 },
			});
			expect(calculateFinanceLedger(s).charges.map((c) => c.amount)).toEqual([
				value,
				5000,
			]);
			expect(s.charges[0].usesBaseAmount).toBe(false);
			s = edit(s, null);
			expect(s.charges[0]).toMatchObject({
				amount: 5000,
				usesBaseAmount: true,
			});
		}
	});
	it("参加取り消しは請求予定を0にし、個別額・入金・経費を保持する", () => {
		const s = edit(fixture(), 8000);
		const id = s.charges[0].id;
		s.payments = [
			{
				id: "paid",
				kind: "collection",
				referenceId: id,
				amount: 8000,
				at,
				note: "",
				migrated: false,
			},
		];
		s.expenses = [
			{
				id: "expense",
				categoryId: "day",
				itemId: null,
				title: "取消不可の宿代",
				amount: 2000,
				kind: "expense",
				payerId: null,
				recipients: [],
				allocation: { mode: "weights", rows: [{ personId: "a", value: 1 }] },
				note: "",
			},
		];
		const payments = structuredClone(s.payments),
			expenses = structuredClone(s.expenses);
		syncFinanceSources(s, source(["b"]));
		expect(
			calculateFinanceLedger(s).charges.find((c) => c.id === id),
		).toMatchObject({ amount: 0, received: 8000, remaining: -8000 });
		expect(
			calculateFinanceLedger(s).participants.find((p) => p.id === "a"),
		).toMatchObject({ cost: 2000, proposedRemaining: 6000 });
		expect(getPlannedCollection(s, "a").amount).toBe(0);
		expect(s.payments).toEqual(payments);
		expect(s.expenses).toEqual(expenses);
		expect(s.charges.find((c) => c.id === id)).toMatchObject({
			amount: 8000,
			usesBaseAmount: false,
		});
		syncFinanceSources(s, source());
		expect(
			calculateFinanceLedger(s).charges.find((c) => c.id === id)?.amount,
		).toBe(8000);
		expect(s.charges).toHaveLength(2);
	});
	it("アーカイブでは対象者と請求を維持する", () => {
		const s = fixture();
		expect(syncFinanceSources(s, source([], true))).toBe(false);
		expect(s.categories[0].memberIds).toEqual(["a", "b"]);
		expect(calculateFinanceLedger(s).charges.map((c) => c.amount)).toEqual([
			10000, 10000,
		]);
	});
	it("手動区分追加で即反映し、未入金なら区分と基本請求を削除できる", () => {
		let s = fixture();
		s = command(s, {
			action: "put",
			resource: "categories",
			value: { id: "manual", name: "任意", baseAmount: 500, memberIds: ["a"] },
		});
		expect(s.charges.find((c) => c.categoryId === "manual")).toMatchObject({
			personId: "a",
			amount: 500,
			isBase: true,
		});
		s = command(s, { action: "remove", resource: "categories", id: "manual" });
		expect(s.charges.some((c) => c.categoryId === "manual")).toBe(false);
	});
	it("基本請求の単独削除と汎用画面からの付け替えを拒否する", () => {
		const s = fixture();
		expect(() =>
			command(s, {
				action: "remove",
				resource: "charges",
				id: s.charges[0].id,
			}),
		).toThrow("基本請求は削除できません");
		expect(() =>
			command(s, {
				action: "put",
				resource: "charges",
				value: { ...s.charges[0], personId: "b" },
			}),
		).toThrow("参加者の請求編集画面");
	});
});
describe("参加者単位の一括編集", () => {
	it("基本請求と追加請求を一括更新し、他の人と入出金を維持する", () => {
		const s = fixture();
		const next = command(s, {
			action: "participantCharges",
			personId: "a",
			baseChanges: [
				{ categoryId: "day", amountOverride: 8000, note: "途中参加" },
			],
			extras: [
				{ id: "hat", categoryId: null, title: "帽子", amount: 2000, note: "" },
				{
					id: "cancel",
					categoryId: "day",
					title: "別途負担",
					amount: 300,
					note: "",
				},
			],
		});
		expect(next.charges.filter((c) => c.personId === "b")).toEqual(
			s.charges.filter((c) => c.personId === "b"),
		);
		expect(next.charges.find((c) => c.id === "hat")).toMatchObject({
			isBase: false,
			personId: "a",
			amount: 2000,
			categoryId: null,
		});
		expect(next.inputRevision).toBe(s.inputRevision + 1);
	});
	it("一部の追加請求が不正なら元の基本金額も変更しない", () => {
		const s = fixture();
		const before = structuredClone(s);
		expect(() =>
			command(s, {
				action: "participantCharges",
				personId: "a",
				baseChanges: [{ categoryId: "day", amountOverride: 1000, note: "" }],
				extras: [
					{
						id: s.charges[1].id,
						categoryId: null,
						title: "不正",
						amount: 1,
						note: "",
					},
				],
			}),
		).toThrow("別の参加者や基本請求");
		expect(s).toEqual(before);
	});
	it("対象外の区分の基本請求は編集できない", () => {
		const s = fixture();
		syncFinanceSources(s, source(["b"]));
		expect(() => edit(s, 1000)).toThrow("請求対象外");
	});
	it("入金のある追加請求の削除・区分変更は拒否し、金額訂正は可能", () => {
		let s = fixture();
		const extra = {
			id: "hat",
			categoryId: null,
			title: "帽子",
			amount: 2000,
			note: "",
		};
		s = command(s, {
			action: "participantCharges",
			personId: "a",
			baseChanges: [],
			extras: [extra],
		});
		s.payments = [
			{
				id: "paid",
				kind: "collection",
				referenceId: "hat",
				amount: 2000,
				at,
				note: "",
				migrated: false,
			},
		];
		expect(() =>
			command(s, {
				action: "participantCharges",
				personId: "a",
				baseChanges: [],
				extras: [],
			}),
		).toThrow("入金記録");
		expect(() =>
			command(s, {
				action: "participantCharges",
				personId: "a",
				baseChanges: [],
				extras: [{ ...extra, categoryId: "day" }],
			}),
		).toThrow("精算区分は変更できません");
		const next = command(s, {
			action: "participantCharges",
			personId: "a",
			baseChanges: [],
			extras: [{ ...extra, amount: 1800 }],
		});
		expect(next.payments).toEqual(s.payments);
	});
});
