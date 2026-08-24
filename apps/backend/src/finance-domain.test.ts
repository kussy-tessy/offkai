import {
	EventFinance,
	FinalRefundCalculator,
	MoneyAmount,
	ParticipantFinance,
	SettlementCalculator,
	SettlementExpense,
	SettlementCategory,
	SettlementIncome,
	type OffkaiEventId,
	type QuestionId,
	type SettlementCategoryId,
	type UserId,
} from "@offkai/core";
import { describe, expect, it } from "vitest";

const eventId = "019c0000-0000-7000-8000-000000000001" as OffkaiEventId;
const questionId = "019c0000-0000-7000-8000-000000000002" as QuestionId;
const userA = "019c0000-0000-7000-8000-000000000003" as UserId;
const userB = "019c0000-0000-7000-8000-000000000004" as UserId;
const userC = "019c0000-0000-7000-8000-000000000006" as UserId;

describe("MoneyAmount", () => {
	it("加算と最終丸めを安全に行う", () => {
		expect(MoneyAmount.from(1533).add(MoneyAmount.from(700)).value).toBe(2233);
		expect(MoneyAmount.from(2233).roundDown(100).value).toBe(2200);
	});

	it.each([-1, 1.5, 2_147_483_648])("不正な金額 %s を拒否する", (amount) => {
		expect(() => MoneyAmount.from(amount)).toThrow();
	});

	it("合計のオーバーフローを拒否する", () => {
		expect(() =>
			MoneyAmount.from(2_147_483_647).add(MoneyAmount.from(1)),
		).toThrow();
	});
});

describe("SettlementCategory", () => {
	const createCategory = () =>
		SettlementCategory.create({
			eventId,
			name: " ロケ ",
			baseParticipationFeeAmount: 5000,
			commitmentQuestionId: questionId,
		});

	it("個別金額を優先し、nullでは標準金額を使う", () => {
		const category = createCategory()
			.setMember(userA, 0)
			.setMember(userB, null);
		expect(category.name).toBe("ロケ");
		expect(category.amountFor(userA)).toBe(0);
		expect(category.amountFor(userB)).toBe(5000);
	});

	it("回答同期でメンバーを置換し個別金額を解除する", () => {
		const result = createCategory()
			.setMember(userA, 3000)
			.syncMembers([userA, userB]);
		expect(result).toMatchObject({
			addedCount: 1,
			removedCount: 0,
			resetOverrideCount: 1,
		});
		expect(result.category.members).toEqual([
			{ userId: userA, amountOverride: null },
			{ userId: userB, amountOverride: null },
		]);
	});
});

describe("EventFinance", () => {
	it("参加費を確定し、徴収開始後は確定解除できない", () => {
		const locked = EventFinance.create(eventId).lockFeeCalculation(
			new Date("2026-08-18T12:00:00.000Z"),
		);
		expect(locked.unlockFeeCalculation().feeCalculationLockedAt).toBeNull();

		const started = locked.markCollectionStarted(
			new Date("2026-08-19T01:00:00.000Z"),
		);
		expect(() => started.unlockFeeCalculation()).toThrow("徴収を開始");
	});

	it("区分名の重複を拒否する", () => {
		const first = SettlementCategory.create({
			eventId,
			name: "宿泊",
			baseParticipationFeeAmount: 10000,
			commitmentQuestionId: null,
		});
		const second = SettlementCategory.reconstruct({
			...first,
			id: "019c0000-0000-7000-8000-000000000005" as SettlementCategoryId,
		});
		expect(() =>
			EventFinance.create(eventId).addCategory(first).addCategory(second),
		).toThrow("同じ名前");
	});

	it("経費精算を確定してから返金を開始する", () => {
		const first = new Date("2026-08-20T01:00:00.000Z");
		const locked = EventFinance.create(eventId)
			.lockFeeCalculation(new Date("2026-08-19T01:00:00.000Z"))
			.lockSettlement(new Date("2026-08-19T02:00:00.000Z"))
			.markRefundStarted(first);
		expect(
			locked.markRefundStarted(new Date("2026-08-21T01:00:00.000Z"))
				.refundStartedAt,
		).toEqual(first);
		expect(() => locked.unlockSettlement()).toThrow("返金を開始");
	});

	it("返金開始前なら経費精算の確定を解除できる", () => {
		const finance = EventFinance.create(eventId)
			.lockFeeCalculation(new Date("2026-08-19T01:00:00.000Z"))
			.lockSettlement(new Date("2026-08-20T01:00:00.000Z"));
		expect(finance.unlockSettlement().settlementLockedAt).toBeNull();
		expect(() => finance.unlockFeeCalculation()).toThrow("経費精算を確定");
	});

	it("参加者がいる区分の削除を拒否する", () => {
		const category = SettlementCategory.create({
			eventId,
			name: "宿泊",
			baseParticipationFeeAmount: 10000,
			commitmentQuestionId: null,
		}).setMember(userA, null);
		expect(() =>
			EventFinance.create(eventId)
				.addCategory(category)
				.removeCategory(category.id),
		).toThrow("参加者が登録");
	});
});

describe("ParticipantFinance", () => {
	it("徴収済みと未徴収を切り替えられる", () => {
		const finance = ParticipantFinance.reconstruct({
			userId: userA,
			note: null,
			extraCharges: [],
			chargeAmount: 5000,
		});
		const collectedAt = new Date("2026-08-18T12:34:56.000Z");

		const collected = finance.markCollected(collectedAt);
		expect(collected.collectedAt).toEqual(collectedAt);
		expect(collected.markUncollected().collectedAt).toBeNull();
	});

	it("返金額を保存して返金済みを切り替えられる", () => {
		const calculatedAt = new Date("2026-08-20T01:00:00.000Z");
		const refundedAt = new Date("2026-08-21T01:00:00.000Z");
		const finance = ParticipantFinance.reconstruct({
			userId: userA,
			note: null,
			extraCharges: [],
			chargeAmount: 5000,
		}).setRefundCalculation(1700, calculatedAt);
		expect(finance.refundAmount).toBe(1700);
		expect(finance.refundCalculatedAt).toEqual(calculatedAt);
		expect(
			finance.markRefunded(refundedAt).markUnrefunded().refundedAt,
		).toBeNull();
	});

	it("区分金額と追加請求から総請求額を計算する", () => {
		const extraCharge = ParticipantFinance.createExtraCharge({
			title: " Tシャツ大 ",
			amount: 1800,
			note: null,
		});
		const finance = ParticipantFinance.calculate({
			userId: userA,
			note: null,
			categoryAmounts: [5000, 10000],
			extraCharges: [extraCharge],
		});
		expect(finance.chargeAmount).toBe(16800);
		expect(finance.extraCharges[0]?.title).toBe("Tシャツ大");
	});

	it("追加請求と備考をEntity経由で変更する", () => {
		const initial = ParticipantFinance.reconstruct({
			userId: userA,
			note: null,
			chargeAmount: 0,
			extraCharges: [],
		});
		const added = initial
			.changeNote("受付で確認")
			.addExtraCharge({ title: "Tシャツ", amount: 1800, note: null });
		const charge = added.extraCharges[0];
		expect(charge).toBeDefined();
		const edited = added.editExtraCharge(charge!.id, {
			title: "Tシャツ大",
			amount: 2000,
			note: "サイズ変更",
		});
		expect(edited.note).toBe("受付で確認");
		expect(edited.extraCharges[0]).toMatchObject({
			title: "Tシャツ大",
			amount: 2000,
		});
		expect(edited.removeExtraCharge(charge!.id).extraCharges).toEqual([]);
	});
});

describe("SettlementCalculator", () => {
	it("受取人ごとに異なる協力金を拒否する", () => {
		const category = SettlementCategory.create({
			eventId,
			name: "ロケ",
			baseParticipationFeeAmount: 5000,
			commitmentQuestionId: questionId,
		});

		expect(() =>
			SettlementExpense.create({
				categoryId: category.id,
				title: "車出し",
				amount: null,
				note: null,
				recipients: [
					{ userId: userA, amount: 200 },
					{ userId: userB, amount: 300 },
				],
			}),
		).toThrow("同じ金額");
	});

	it("通常経費と複数人の協力金から丸め前内訳を計算する", () => {
		const category = SettlementCategory.create({
			eventId,
			name: "ロケ",
			baseParticipationFeeAmount: 5000,
			commitmentQuestionId: questionId,
		})
			.setMember(userA, null)
			.setMember(userB, null)
			.setMember("019c0000-0000-7000-8000-000000000006" as UserId, null);
		const normal = SettlementExpense.create({
			categoryId: category.id,
			title: "更衣室代",
			amount: 10000,
			note: null,
			recipients: [],
		});
		const cooperation = SettlementExpense.create({
			categoryId: category.id,
			title: "車出し",
			amount: null,
			note: null,
			recipients: [
				{ userId: userA, amount: 200 },
				{ userId: userB, amount: 200 },
			],
		});

		const result = SettlementCalculator.calculate(category, [
			normal,
			cooperation,
		]);

		expect(result).toMatchObject({
			participantFeeIncome: 15000,
			additionalIncomeTotal: 0,
			totalIncome: 15000,
			normalExpenseTotal: 10000,
			recipientExpenseTotal: 400,
			commonRefundPool: 4600,
			memberCount: 3,
		});
		expect(result.participantBreakdowns[0]).toMatchObject({
			userId: userA,
			commonRefund: { numerator: 4600, denominator: 3 },
			recipientAmount: 200,
			total: { numerator: 5200, denominator: 3 },
		});
	});

	it("参加者に紐づかない収入を共通返金原資へ加える", () => {
		const category = SettlementCategory.create({
			eventId,
			name: "宿泊",
			baseParticipationFeeAmount: 10000,
			commitmentQuestionId: null,
		}).setMember(userA, null);
		const income = SettlementIncome.create({
			categoryId: category.id,
			title: "繰越金",
			amount: 2000,
			note: null,
		});

		expect(
			SettlementCalculator.calculate(category, [], [income]),
		).toMatchObject({
			participantFeeIncome: 10000,
			additionalIncomeTotal: 2000,
			totalIncome: 12000,
			commonRefundPool: 12000,
		});
	});

	it("赤字を負の共通返金として保持する", () => {
		const category = SettlementCategory.create({
			eventId,
			name: "赤字区分",
			baseParticipationFeeAmount: 100,
			commitmentQuestionId: null,
		}).setMember(userA, null);
		const expense = SettlementExpense.create({
			categoryId: category.id,
			title: "経費",
			amount: 150,
			note: null,
			recipients: [],
		});

		expect(
			SettlementCalculator.calculate(category, [expense]).commonRefundPool,
		).toBe(-50);
	});
});

describe("FinalRefundCalculator", () => {
	it("区分結果を参加者単位で合算して最後に一度だけ切り捨てる", () => {
		const category = SettlementCategory.create({
			eventId,
			name: "ロケ",
			baseParticipationFeeAmount: 5000,
			commitmentQuestionId: null,
		})
			.setMember(userA, null)
			.setMember(userB, null)
			.setMember(userC, null);
		const expenses = [
			SettlementExpense.create({
				categoryId: category.id,
				title: "更衣室代",
				amount: 10000,
				note: null,
				recipients: [],
			}),
			SettlementExpense.create({
				categoryId: category.id,
				title: "車出し",
				amount: null,
				note: null,
				recipients: [
					{ userId: userA, amount: 200 },
					{ userId: userB, amount: 200 },
				],
			}),
		];
		const calculation = FinalRefundCalculator.calculate(
			[
				{
					categoryId: category.id,
					categoryName: category.name,
					calculation: SettlementCalculator.calculate(category, expenses),
				},
			],
			100,
		);

		expect(calculation.participants.map((item) => item.refundAmount)).toEqual([
			1700, 1700, 1500,
		]);
		expect(calculation).toMatchObject({
			totalUnroundedRefundAmount: 5000,
			totalRefundAmount: 4900,
			roundingRemainder: 100,
		});
	});
});
