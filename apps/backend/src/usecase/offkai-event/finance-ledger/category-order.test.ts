import type { FinanceLedger } from "@offkai/core";
import { describe, expect, it } from "vitest";
import { orderFinanceCategories } from "./ledger.sources";

const category = (
	id: string,
	questionId: string | null,
): FinanceLedger["categories"][number] => ({
	id,
	questionId,
	name: id,
	baseAmount: 1000,
	memberIds: [],
});
describe("精算区分の表示順", () => {
	it("質問順に並べ、手動区分の相対順と保存済み配列を維持する", () => {
		const categories = [
			category("custom1", null),
			category("second", "q2"),
			category("custom2", null),
			category("first", "q1"),
		];
		const before = structuredClone(categories);
		expect(
			orderFinanceCategories(categories, [{ id: "q1" }, { id: "q2" }]).map(
				(c) => c.id,
			),
		).toEqual(["first", "second", "custom1", "custom2"]);
		expect(categories).toEqual(before);
		expect(
			orderFinanceCategories(categories, [{ id: "q2" }, { id: "q1" }]).map(
				(c) => c.id,
			),
		).toEqual(["second", "first", "custom1", "custom2"]);
	});
	it("アーカイブ済み質問も指定順を使い、参照不明の区分も失わない", () => {
		const categories = [
			category("custom", null),
			category("unknown", "missing"),
			category("active", "q2"),
			category("archived", "q1"),
		];
		expect(
			orderFinanceCategories(categories, [{ id: "q1" }, { id: "q2" }]).map(
				(c) => c.id,
			),
		).toEqual(["archived", "active", "unknown", "custom"]);
	});
});
