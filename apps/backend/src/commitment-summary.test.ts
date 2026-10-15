import { describe, expect, it } from "vitest";
import { summarizeCommitments } from "../../frontend/src/common/utils/commitmentSummary";

const now = Date.parse("2026-10-09T00:00:00Z");
const question = (
	id: string,
	days: number,
	capacity: number,
	yesCount: number,
) => ({
	id,
	questionShort: id,
	deadline: new Date(now + days * 86400000).toISOString(),
	capacity,
	yesCount,
	required: false,
});
describe("概要の参加受付バッジ", () => {
	it("最短の締切と最少の残席を別々に選ぶ", () => {
		const result = summarizeCommitments(
			[question("早い", 1, 20, 10), question("少ない", 3, 30, 29)],
			now,
		);
		expect(result.status).toBeNull();
		expect(result.deadline?.id).toBe("早い");
		expect(result.capacity?.id).toBe("少ない");
	});
	it("期限超過か満員の項目を除いて代表を選ぶ", () => {
		const result = summarizeCommitments(
			[
				question("期限", -1, 20, 0),
				question("満員", 1, 10, 10),
				question("受付中", 3, 10, 8),
			],
			now,
		);
		expect(result.status).toBe("一部締切済");
		expect(result.deadline?.id).toBe("受付中");
		expect(result.capacity?.id).toBe("受付中");
	});
	it("全項目が締まったら締切済だけを返す", () => {
		expect(
			summarizeCommitments(
				[question("期限", -1, 20, 0), question("超過", 1, 10, 11)],
				now,
			),
		).toEqual({ status: "締切済", deadline: undefined, capacity: undefined });
	});
	it("項目なし・制限なしを締切済扱いにしない", () => {
		expect(summarizeCommitments([], now).status).toBeNull();
		expect(
			summarizeCommitments(
				[{ ...question("無制限", 1, 10, 0), deadline: null, capacity: null }],
				now,
			),
		).toEqual({ status: null, deadline: undefined, capacity: undefined });
	});
});
