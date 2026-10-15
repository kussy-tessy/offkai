import {
	applyLedgerCommand,
	calculateFinanceLedger,
	FinanceLedgerSchema,
	getPlannedCollection,
	getPlannedRefund,
} from "@offkai/core";
import { describe, expect, it } from "vitest";
import { ledgerCommandRequirements } from "./ledger-permissions";

const at = "2026-09-23T10:00:00.000Z";
function fixture() {
	return FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: 0,
		roundingUnit: 1,
		people: [{ id: "a", name: "A" }],
		categories: [
			{ id: "day", name: "1日目", baseAmount: 4000, memberIds: ["a"] },
		],
		items: [],
		charges: [
			{
				id: "fee",
				isBase: true,
				personId: "a",
				categoryId: "day",
				title: "参加費",
				amount: 4000,
				confirmed: true,
			},
			{
				id: "hat",
				personId: "a",
				categoryId: null,
				title: "帽子代",
				amount: 500,
				confirmed: true,
			},
		],
		expenses: [],
		incomes: [],
		adjustments: [],
		payments: [
			{
				id: "partial",
				kind: "collection",
				referenceId: "fee",
				amount: 1000,
				at,
			},
		],
		snapshot: null,
		migrationNotes: [],
	});
}
function cmd(action: "collectPlanned" | "refundPlanned") {
	return {
		action,
		personId: "a",
		revision: 0,
		requestId: "00000000-0000-4000-8000-000000000001",
	};
}
describe("予定額チェックボックス", () => {
	it("部分徴収後に返金を始めても参加費を徴収できる", () => {
		const next = applyLedgerCommand(
			fixture(),
			cmd("refundPlanned"),
			"staff",
			at,
		);
		expect(next.people[0].settlementStarted).toBe(true);
		expect(calculateFinanceLedger(next).participants[0].remaining).toBe(0);
		expect(getPlannedCollection(next, "a").eligible).toBe(true);
		expect(() =>
			applyLedgerCommand(next, cmd("collectPlanned"), "staff", at),
		).not.toThrow();
		const payment = {
			id: "extra",
			kind: "collection" as const,
			referenceId: "fee",
			amount: 100,
			at,
			note: "",
			migrated: false,
		};
		const put = {
			...cmd("collectPlanned"),
			action: "put" as const,
			resource: "payments" as const,
			value: payment,
		};
		expect(() => applyLedgerCommand(next, put, "staff", at)).not.toThrow();
		expect(() =>
			applyLedgerCommand(
				next,
				{ ...put, value: { ...payment, referenceId: "hat" } },
				"staff",
				at,
			),
		).not.toThrow();
		const corrected = applyLedgerCommand(
			next,
			{ ...put, value: { ...next.payments[0], amount: 1200 } },
			"staff",
			at,
		);
		expect(calculateFinanceLedger(corrected).participants[0].remaining).toBe(
			200,
		);
		const removed = applyLedgerCommand(
			next,
			{
				...cmd("collectPlanned"),
				action: "remove",
				resource: "payments",
				id: next.payments[1].id,
			},
			"staff",
			at,
		);
		expect(removed.people[0].settlementStarted).toBe(false);
	});
	it("差額ゼロでも切替でき、後日の費用変更は追加徴収になる", () => {
		const s = fixture();
		s.payments = [];
		const next = applyLedgerCommand(
			s,
			{ ...cmd("collectPlanned"), action: "startSettlement" },
			"staff",
			at,
		);
		expect(next.payments).toHaveLength(0);
		expect(next.people[0].settlementStarted).toBe(true);
		expect(getPlannedCollection(next, "a").eligible).toBe(true);
		next.expenses.push({
			id: "cost",
			categoryId: "day",
			itemId: null,
			title: "費用",
			amount: 500,
			kind: "expense",
			payerId: null,
			recipients: [],
			note: "",
			allocation: { mode: "weights", rows: [{ personId: "a", value: 1 }] },
		});
		expect(calculateFinanceLedger(next).participants[0].remaining).toBe(-500);
		expect(
			ledgerCommandRequirements(s, {
				...cmd("collectPlanned"),
				action: "startSettlement",
			}),
		).toEqual([{ area: "refund", level: "record" }]);
	});
	it("参加費だけを一括徴収し、別会計の請求は独立して残す", () => {
		const s = fixture();
		expect(getPlannedCollection(s, "a").amount).toBe(3000);
		const next = applyLedgerCommand(s, cmd("collectPlanned"), "staff", at);
		expect(
			next.payments.slice(1).map((p) => [p.kind, p.referenceId, p.amount]),
		).toEqual([["collection", "fee", 3000]]);
		expect(next.payments[0]).toEqual(s.payments[0]);
		expect(next.inputRevision).toBe(s.inputRevision);
		expect(getPlannedCollection(next, "a")).toMatchObject({
			complete: true,
			eligible: false,
			amount: 0,
		});
		expect(() =>
			applyLedgerCommand(next, cmd("collectPlanned"), "staff", at),
		).toThrow("徴収済み");
		expect(FinanceLedgerSchema.safeParse(next).success).toBe(true);
	});
	it("旧下書きも保存済みの請求として徴収できる", () => {
		const s = fixture();
		s.charges[1].confirmed = false;
		const next = applyLedgerCommand(s, cmd("collectPlanned"), "staff", at);
		expect(getPlannedCollection(next, "a").complete).toBe(true);
	});
	it("全区分を一括作成し、個別金額と既存入金を上書きしない", () => {
		const s = fixture();
		s.categories.push({
			id: "second",
			name: "2日目",
			baseAmount: 2000,
			memberIds: ["a"],
		});
		s.charges[0].amount = 1500;
		const command = {
			revision: 0,
			requestId: "00000000-0000-4000-8000-000000000009",
			action: "createCategoryCharges" as const,
		};
		const next = applyLedgerCommand(s, command, "staff", at);
		expect(next.charges.find((c) => c.id === "fee")?.amount).toBe(1500);
		expect(next.charges.find((c) => c.categoryId === "second")).toMatchObject({
			amount: 2000,
			confirmed: true,
		});
		expect(next.payments).toEqual(s.payments);
		expect(applyLedgerCommand(next, command, "staff", at).charges).toEqual(
			next.charges,
		);
	});

	it("確定済みゼロ円・過入金明細には追加入金を作らない", () => {
		const s = fixture();
		s.charges[0].amount = 500;
		s.charges[1].amount = 0;
		expect(getPlannedCollection(s, "a")).toMatchObject({
			amount: 0,
			complete: true,
		});
	});
	it("精算による追加徴収後も参加費を別記録として徴収できる", () => {
		const s = fixture();
		s.payments.push({
			...s.payments[0],
			id: "recovered",
			kind: "recovery",
			referenceId: "a",
			amount: 500,
		});
		expect(getPlannedCollection(s, "a").eligible).toBe(true);
		expect(() =>
			applyLedgerCommand(s, cmd("collectPlanned"), "staff", at),
		).not.toThrow();
	});
	it("請求がない人には操作させない", () => {
		const s = fixture();
		s.charges = [];
		s.payments = [];
		expect(getPlannedCollection(s, "a")).toMatchObject({
			complete: false,
			eligible: false,
		});
	});
	it("返金は支払済み分を差し引き、旧確定額でなく最新額を使う", () => {
		const s = fixture();
		s.payments[0].amount = 4000;
		s.payments.push({
			...s.payments[0],
			id: "refund-partial",
			kind: "refund",
			referenceId: "a",
			amount: 200,
		});
		s.snapshot = {
			at,
			actorId: "owner",
			inputRevision: 0,
			targets: { a: 3500 },
			migrated: false,
		};
		s.inputRevision = 1;
		const next = applyLedgerCommand(s, cmd("refundPlanned"), "staff", at);
		expect(next.payments.at(-1)).toMatchObject({
			kind: "refund",
			referenceId: "a",
			amount: 3800,
		});
		expect(next.snapshot).toEqual(s.snapshot);
		expect(() =>
			applyLedgerCommand(next, cmd("refundPlanned"), "staff", at),
		).toThrow("返金する残額");
	});
	it("確定なしで返金でき、未配分・追加徴収・残額ゼロは拒否", () => {
		const s = fixture();
		expect(() =>
			applyLedgerCommand(s, cmd("refundPlanned"), "staff", at),
		).not.toThrow();
		s.expenses.push({
			id: "expense",
			categoryId: "day",
			itemId: null,
			title: "経費",
			amount: 2000,
			kind: "expense",
			allocation: { mode: "weights", rows: [{ personId: "a", value: 0 }] },
			payerId: null,
			recipients: [],
			note: "",
		});
		expect(() =>
			applyLedgerCommand(s, cmd("refundPlanned"), "staff", at),
		).toThrow("未配分");
		s.expenses[0].allocation.rows[0].value = 1;
		expect(() =>
			applyLedgerCommand(s, cmd("refundPlanned"), "staff", at),
		).toThrow("追加徴収");
		expect(getPlannedRefund(0)).toMatchObject({
			eligible: false,
			complete: true,
		});
	});
	it("それぞれの記録権限を要求する", () => {
		expect(ledgerCommandRequirements(fixture(), cmd("collectPlanned"))).toEqual(
			[{ area: "feeCollection", level: "record" }],
		);
		expect(ledgerCommandRequirements(fixture(), cmd("refundPlanned"))).toEqual([
			{ area: "refund", level: "record" },
		]);
	});
});
