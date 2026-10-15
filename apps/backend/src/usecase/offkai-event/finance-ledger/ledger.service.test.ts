import {
	type FinanceLedger,
	FinanceLedgerSchema,
	LegacyStaffPermissions,
	OffkaiEventIdSchema,
	UserIdSchema,
} from "@offkai/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	read: vi.fn(),
	write: vi.fn(),
	sources: vi.fn(),
	auth: vi.fn(),
	db: {
		user: { findMany: vi.fn() },
		financeLedger: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		financeLedgerHistory: {
			create: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
		},
		eventFinance: { findUnique: vi.fn() },
		participantFinance: { findFirst: vi.fn() },
		participantPayment: { findFirst: vi.fn() },
		$executeRaw: vi.fn(),
		$transaction: vi.fn(),
	},
}));
vi.mock("../../../repository/prisma", () => ({ prisma: mocks.db }));
vi.mock("../../../authorization/staff-permissions", async (original) => ({
	...(await original<object>()),
	getEventAuthorizationContext: mocks.auth,
}));
vi.mock("../../../repository/finance-ledger/state", () => ({
	readLedger: mocks.read,
	writeLedger: mocks.write,
}));
vi.mock("../../../repository/finance-ledger/sources", async (original) => ({
	...(await original<object>()),
	readFinanceSources: mocks.sources,
}));

import { changeLedger, getLedger, getLedgerHistory } from "./ledger.service";

const eventId = OffkaiEventIdSchema.parse(
	"019c0000-0000-7000-8000-000000000001",
);
const userId = UserIdSchema.parse("019c0000-0000-7000-8000-000000000002");
const requestId = "00000000-0000-4000-8000-000000000001";
const empty = () =>
	FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: 0,
		roundingUnit: 1,
		people: [{ id: "a", name: "A" }],
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
let stored: { revision: number; state: FinanceLedger } | null;
const charge = {
	id: "hat",
	personId: "a",
	categoryId: null,
	title: "帽子",
	amount: 2000,
	note: "",
	confirmed: true,
};
const request = {
	revision: 4,
	requestId,
	action: "put",
	resource: "charges",
	value: charge,
};
beforeEach(() => {
	vi.resetAllMocks();
	stored = { revision: 4, state: empty() };
	mocks.auth.mockResolvedValue({
		role: "owner",
		isParticipant: true,
		permissions: LegacyStaffPermissions,
	});
	mocks.sources.mockResolvedValue({ people: [], questions: [] });
	mocks.read.mockImplementation(async () => structuredClone(stored));
	mocks.write.mockImplementation(async (_tx, _id, state) => {
		stored!.state = structuredClone(state);
	});
	mocks.db.$transaction.mockImplementation(async (cb) => cb(mocks.db));
	mocks.db.financeLedger.create.mockImplementation(async () => {
		stored = { revision: 0, state: empty() };
		return stored;
	});
	mocks.db.financeLedger.update.mockImplementation(async ({ data }) => {
		stored!.revision = data.revision;
	});
	mocks.db.financeLedger.updateMany.mockImplementation(async () => {
		stored!.revision++;
		return { count: 1 };
	});
	mocks.db.financeLedgerHistory.findUnique.mockResolvedValue(null);
	mocks.db.eventFinance.findUnique.mockResolvedValue(null);
	mocks.db.participantFinance.findFirst.mockResolvedValue(null);
	mocks.db.participantPayment.findFirst.mockResolvedValue(null);
});
function staff(area: string, level: string) {
	mocks.auth.mockResolvedValue({
		role: "staff",
		isParticipant: true,
		permissions: {
			feeCalculation: "none",
			feeCollection: "none",
			settlement: "none",
			refund: "none",
			[area]: level,
		},
	});
}
describe("テーブル台帳の保存と認可", () => {
	it("回答名の変更は表示だけに反映し、台帳・版番号・履歴を更新しない", async () => {
		stored!.state.people[0] = { id: "a", name: "旧名", settlementStarted: true };
		stored!.state.charges = [charge];
		const before = structuredClone(stored);
		mocks.sources.mockResolvedValue({
			people: [{ id: "a", name: "変更後の長い参加者名aaaaaaaa" }],
			questions: [],
		});
		for (let i = 0; i < 2; i++) {
			const page = await getLedger(eventId, userId);
			expect(page.state.people[0].name).toBe("変更後の長い参加者名aaaaaaaa");
			expect(page.calculation.participants[0].name).toBe("変更後の長い参加者名aaaaaaaa");
			expect(page.revision).toBe(before!.revision);
			expect(page.state.inputRevision).toBe(before!.state.inputRevision);
		}
		expect(stored).toEqual(before);
		expect(mocks.write).not.toHaveBeenCalled();
		expect(mocks.db.financeLedger.update).not.toHaveBeenCalled();
		expect(mocks.db.financeLedger.updateMany).not.toHaveBeenCalled();
		expect(mocks.db.financeLedgerHistory.create).not.toHaveBeenCalled();
	});

	it("回答がなくなった参加者は台帳の保存名を表示する", async () => {
		const page = await getLedger(eventId, userId);
		expect(page.state.people[0].name).toBe("A");
		expect(page.calculation.participants[0].name).toBe("A");
		expect(mocks.write).not.toHaveBeenCalled();
		expect(mocks.db.financeLedgerHistory.create).not.toHaveBeenCalled();
	});

	it("返金直前に参加回答の変更が見つかった場合は再確認を要求する", async () => {
		mocks.sources.mockResolvedValue({
			people: [{ id: "a", name: "A" }],
			questions: [
				{ id: "new-day", label: "追加区分", archived: false, personIds: ["a"] },
			],
		});
		await expect(
			changeLedger(eventId, userId, {
				revision: 4,
				requestId,
				action: "refundPlanned",
				personId: "a",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(mocks.write).not.toHaveBeenCalled();
	});
	it("精算の編集権限で切捨て単位を変更できる", async () => {
		staff("settlement", "edit");
		await expect(
			changeLedger(eventId, userId, {
				revision: 4,
				requestId,
				action: "rounding",
				unit: 10,
			}),
		).resolves.toMatchObject({ state: { roundingUnit: 10 } });
	});
	it("現在値はリポジトリへ、JSONは履歴のみへ保存", async () => {
		const page = await changeLedger(eventId, userId, request);
		expect(page.state.charges[0].amount).toBe(2000);
		expect(mocks.write).toHaveBeenCalledOnce();
		expect(mocks.db.financeLedger.updateMany.mock.calls[0][0].data).toEqual({
			revision: { increment: 1 },
		});
		expect(
			mocks.db.financeLedgerHistory.create.mock.calls[0][0].data,
		).toMatchObject({
			revision: 5,
			action: "put",
			state: { charges: [charge] },
		});
	});
	it("旧版の変更を拒否し現在値も履歴も保存しない", async () => {
		await expect(
			changeLedger(eventId, userId, { ...request, revision: 3 }),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(mocks.write).not.toHaveBeenCalled();
		expect(mocks.db.financeLedgerHistory.create).not.toHaveBeenCalled();
	});
	it("DBの版番号比較が失敗した場合は履歴を書かない", async () => {
		mocks.db.financeLedger.updateMany.mockResolvedValue({ count: 0 });
		await expect(changeLedger(eventId, userId, request)).rejects.toMatchObject({
			code: "CONFLICT",
		});
		expect(mocks.write).not.toHaveBeenCalled();
	});
	it("同じ操作の再送は二重保存しない", async () => {
		mocks.db.financeLedgerHistory.findUnique.mockResolvedValue({
			actorId: userId,
		});
		await changeLedger(eventId, userId, request);
		expect(mocks.write).not.toHaveBeenCalled();
	});
	it("他人の操作ID再利用を拒否", async () => {
		mocks.db.financeLedgerHistory.findUnique.mockResolvedValue({
			actorId: "other",
		});
		await expect(changeLedger(eventId, userId, request)).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});
	it("閲覧スタッフは金額を変更できない", async () => {
		staff("feeCalculation", "read");
		await expect(changeLedger(eventId, userId, request)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		expect(mocks.write).not.toHaveBeenCalled();
	});
	it("経費編集スタッフは精算確定できない", async () => {
		staff("settlement", "edit");
		await expect(
			changeLedger(eventId, userId, {
				revision: 4,
				requestId,
				action: "confirm",
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
	it("権限のないユーザーは初期化も行えない", async () => {
		mocks.auth.mockResolvedValue({
			role: "participant",
			isParticipant: true,
			permissions: LegacyStaffPermissions,
		});
		await expect(getLedger(eventId, userId)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		expect(mocks.db.$transaction).not.toHaveBeenCalled();
	});
	it("請求を保存した直後から入金できる", async () => {
		stored!.state.charges = [{ ...charge, confirmed: false }];
		staff("feeCollection", "record");
		await changeLedger(eventId, userId, {
			...request,
			resource: "payments",
			value: {
				id: "paid",
				kind: "collection",
				referenceId: "hat",
				amount: 2000,
				at: "2026-09-29T00:00:00.000Z",
				note: "",
			},
		});
		expect(stored!.state.payments).toHaveLength(1);
	});
	it("履歴も権限に従って経費情報を隠す", async () => {
		staff("feeCollection", "read");
		const state = empty();
		state.migrationNotes = ["非公開"];
		mocks.db.financeLedgerHistory.findMany.mockResolvedValue([
			{
				revision: 0,
				createdAt: new Date(),
				actorId: userId,
				action: "initialize",
				resource: "initialize",
				state,
			},
		]);
		mocks.db.user.findMany.mockResolvedValue([
			{ id: userId, name: "会計スタッフ" },
		]);
		const rows = await getLedgerHistory(eventId, userId);
		expect(rows[0].actorName).toBe("会計スタッフ");
		expect(rows[0].state.migrationNotes).toEqual([]);
	});
});
describe("質問由来の区分は永続化してから返す", () => {
	beforeEach(() =>
		mocks.sources.mockResolvedValue({
			people: [{ id: "a", name: "A" }],
			questions: [
				{ id: "day", label: "土泊", archived: false, personIds: ["a"] },
			],
		}),
	);
	it("初回閲覧時に区分を保存し、再閲覧で増殖も更新もしない", async () => {
		stored = null;
		const first = await getLedger(eventId, userId);
		expect(first.active).toBe(true);
		expect(first.state.categories).toEqual(stored!.state.categories);
		expect(first.state.categories).toMatchObject([
			{ id: "day", questionId: "day", name: "土泊" },
		]);
		await getLedger(eventId, userId);
		expect(mocks.write).toHaveBeenCalledOnce();
		expect(mocks.db.financeLedgerHistory.create).toHaveBeenCalledOnce();
	});
	it("新しい質問と回答者の反映も現在テーブルと履歴に保存", async () => {
		const first = await getLedger(eventId, userId);
		expect(first.revision).toBe(5);
		expect(stored!.state.categories[0].memberIds).toEqual(["a"]);
		expect(
			mocks.db.financeLedgerHistory.create.mock.calls[0][0].data.action,
		).toBe("syncSources");
		await getLedger(eventId, userId);
		expect(mocks.write).toHaveBeenCalledOnce();
	});
	it("質問名を変更しても同じ区分IDと基本金額を保つ", async () => {
		stored!.state.categories = [
			{
				id: "existing",
				questionId: "day",
				name: "旧名",
				baseAmount: 5000,
				memberIds: ["a"],
			},
		];
		const page = await getLedger(eventId, userId);
		expect(page.state.categories).toEqual([
			{
				id: "existing",
				questionId: "day",
				name: "土泊",
				baseAmount: 5000,
				memberIds: ["a"],
			},
		]);
	});
	it("質問区分の編集で紐づけと名前を書き換えられない", async () => {
		await changeLedger(eventId, userId, {
			...request,
			resource: "categories",
			value: {
				id: "day",
				questionId: null,
				name: "別名",
				baseAmount: 5000,
				memberIds: [],
			},
		});
		expect(stored!.state.categories[0]).toMatchObject({
			questionId: "day",
			name: "土泊",
			baseAmount: 5000,
			memberIds: ["a"],
		});
	});
	it("質問に紐づく区分は削除不可と説明する", async () => {
		await expect(
			changeLedger(eventId, userId, {
				revision: 4,
				requestId,
				action: "remove",
				resource: "categories",
				id: "day",
			}),
		).rejects.toThrow("参加可否質問に対応する区分は削除できません");
	});
	it("アーカイブ質問から新しい区分は作らない", async () => {
		mocks.sources.mockResolvedValue({
			people: [],
			questions: [{ id: "day", label: "土泊", archived: true, personIds: [] }],
		});
		const page = await getLedger(eventId, userId);
		expect(page.state.categories).toHaveLength(0);
		expect(mocks.write).not.toHaveBeenCalled();
	});
});
