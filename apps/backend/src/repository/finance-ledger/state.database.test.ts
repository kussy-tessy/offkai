import {
	applyLedgerCommand,
	calculateFinanceLedger,
	FinanceLedgerSchema,
	OffkaiEventIdSchema,
} from "@offkai/core";
import { type Prisma, PrismaClient } from "@prisma/client";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";
import { buildLegacyLedger } from "../../usecase/offkai-event/finance-ledger/ledger.legacy";
import { readLegacyFinance } from "./legacy";
import { syncFinanceSources } from "../../usecase/offkai-event/finance-ledger/ledger.sources";
import { readFinanceSources } from "./sources";
import { readLedger, writeLedger } from "./state";

async function createEvent(tx: Prisma.TransactionClient) {
	const series = await tx.series.findFirstOrThrow({ select: { id: true } });
	return tx.offkaiEvent.create({
		data: {
			id: uuidv7(),
			seriesId: series.id,
			name: "finance integration rollback",
			eventStartDate: new Date(),
			eventEndDate: new Date(),
			applicationStartDate: new Date(),
			preferenceQuestions: [],
		},
	});
}
async function rollback(run: (tx: Prisma.TransactionClient) => Promise<void>) {
	const db = new PrismaClient();
	try {
		await expect(
			db.$transaction(
				async (tx) => {
					await run(tx);
					throw new Error("EXPECTED_ROLLBACK");
				},
				{ timeout: 30000 },
			),
		).rejects.toThrow("EXPECTED_ROLLBACK");
	} finally {
		await db.$disconnect();
	}
}
const empty = () =>
	FinanceLedgerSchema.parse({
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
async function rejected(
	tx: Prisma.TransactionClient,
	run: () => Promise<unknown>,
) {
	await tx.$executeRawUnsafe("SAVEPOINT check_constraint");
	await expect(run()).rejects.toThrow();
	await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT check_constraint");
}

describe.skipIf(process.env.RUN_LEDGER_DB_TEST !== "1")(
	"正規化台帳の実DB検証（全書込みロールバック）",
	() => {
		it("全明細・配分・参照付き入出金・確定額をテーブルから復元できる", async () =>
			rollback(async (tx) => {
				const event = await createEvent(tx);
				await tx.financeLedger.create({ data: { eventId: event.id } });
				const state = empty();
				state.people = [
					{ id: "a", name: "A", settlementStarted: true },
					{ id: "b", name: "B" },
				];
				state.categories = [
					{
						id: "day",
						questionId: null,
						name: "日ロケ",
						baseAmount: 4000,
						memberIds: ["a", "b"],
					},
				];
				const allocation = {
					mode: "weights" as const,
					rows: [
						{ personId: "a", value: 1 },
						{ personId: "b", value: 0.5 },
					],
				};
				state.items = [
					{ id: "room", categoryId: "day", name: "更衣室", allocation },
				];
				state.charges = [
					{
						id: "base",
						isBase: true,
						personId: "a",
						categoryId: "day",
						title: "参加費",
						amount: 4000,
						usesBaseAmount: true,
						confirmed: true,
						note: "",
					},
					{
						id: "custom",
						isBase: true,
						personId: "b",
						categoryId: "day",
						title: "個別",
						amount: 3000,
						usesBaseAmount: false,
						confirmed: true,
						note: "",
					},
					{
						id: "hat",
						personId: "b",
						categoryId: null,
						title: "帽子",
						amount: 500,
						usesBaseAmount: false,
						confirmed: true,
						note: "",
					},
				];
				state.expenses = [
					{
						id: "expense",
						categoryId: "day",
						itemId: "room",
						title: "更衣室",
						amount: 1500,
						kind: "expense",
						allocation,
						payerId: null,
						recipients: [],
						note: "",
					},
					{
						id: "coop",
						categoryId: "day",
						itemId: null,
						title: "協力金",
						amount: 100,
						kind: "cooperation",
						allocation,
						payerId: null,
						recipients: [{ personId: "b", amount: 100 }],
						note: "",
					},
					{
						id: "hat-out",
						categoryId: null,
						itemId: null,
						title: "帽子送金",
						amount: 500,
						kind: "independent",
						allocation: { mode: "weights", rows: [] },
						payerId: null,
						recipients: [],
						note: "",
					},
				];
				state.incomes = [
					{
						id: "gift",
						categoryId: "day",
						title: "カンパ",
						amount: 300,
						allocation,
						note: "",
					},
				];
				state.adjustments = [
					{
						id: "adjust",
						personId: "b",
						mode: "fixed",
						amount: 2500,
						note: "固定",
					},
				];
				state.payments = [
					["collection", "base", 4000],
					["refund", "a", 100],
					["recovery", "b", 100],
					["expense", "expense", 1500],
					["income", "gift", 300],
				].map(([kind, referenceId, amount], i) => ({
					id: `p${i}`,
					kind: kind as "collection",
					referenceId: String(referenceId),
					amount: Number(amount),
					at: "2026-09-29T00:00:00.000Z",
					note: "",
					migrated: false,
				}));
				state.snapshot = {
					at: "2026-09-29T00:00:00.000Z",
					actorId: "tester",
					inputRevision: 0,
					migrated: false,
					targets: { a: 1000, b: 500 },
				};
				state.migrationNotes = ["移行メモ"];
				await writeLedger(tx, event.id, state);
				expect((await readLedger(tx, event.id))?.state).toEqual(state);
				expect(
					calculateFinanceLedger((await readLedger(tx, event.id))!.state),
				).toEqual(calculateFinanceLedger(state));
				expect(
					await tx.financePayment.count({
						where: { eventId: event.id, chargeId: "base" },
					}),
				).toBe(1);
				const next = applyLedgerCommand(
					state,
					{
						revision: 0,
						requestId: uuidv7(),
						action: "put",
						resource: "categories",
						value: { ...state.categories[0], baseAmount: 5000 },
					},
					"tester",
					new Date().toISOString(),
				);
				await writeLedger(tx, event.id, next);
				const restored = (await readLedger(tx, event.id))!.state;
				expect(restored.charges.map((c) => c.amount)).toEqual([
					5000, 3000, 500,
				]);
				expect(restored.payments).toEqual(state.payments);
				expect(restored.snapshot).toEqual(state.snapshot);
				expect(
					(
						await tx.financeCharge.findFirstOrThrow({
							where: { eventId: event.id, id: "base" },
						})
					).amountOverride,
				).toBeNull();
				const edited = applyLedgerCommand(
					restored,
					{
						revision: 0,
						requestId: uuidv7(),
						action: "participantCharges",
						personId: "a",
						baseChanges: [
							{ categoryId: "day", amountOverride: 4500, note: "" },
						],
						extras: [],
					},
					"tester",
					new Date().toISOString(),
				);
				await writeLedger(tx, event.id, edited);
				expect(
					(await readLedger(tx, event.id))!.state.charges.find(
						(c) => c.id === "base",
					)!.amount,
				).toBe(4500);
				const removedIncome = applyLedgerCommand(
					edited,
					{
						revision: 0,
						requestId: uuidv7(),
						action: "remove",
						resource: "incomes",
						id: "gift",
					},
					"tester",
					new Date().toISOString(),
				);
				await writeLedger(tx, event.id, removedIncome);
				const afterRemoval = (await readLedger(tx, event.id))!.state;
				expect(afterRemoval.incomes).toEqual([]);
				expect(afterRemoval.payments).toEqual(
					edited.payments.filter((p) => p.kind !== "income"),
				);
				await tx.offkaiEvent.delete({ where: { id: event.id } });
				expect(
					await tx.financePayment.count({ where: { eventId: event.id } }),
				).toBe(0);
			}));
		it("質問区分を永続化し、再読込・質問名変更でも同じIDを保つ", async () =>
			rollback(async (tx) => {
				const event = await createEvent(tx);
				const user = await tx.user.findFirstOrThrow({ select: { id: true } });
				const questionId = uuidv7();
				await tx.commitmentQuestion.create({
					data: {
						id: questionId,
						eventId: event.id,
						question: "参加？",
						questionShort: "土泊",
						deadline: new Date(),
						description: "",
						capacity: 100,
						sortOrder: 0,
					},
				});
				await tx.offkaiAnswer.create({
					data: {
						eventId: event.id,
						userId: user.id,
						updatedBy: user.id,
						respondentName: "参加者",
						preferenceAnswers: [],
						commitmentAnswers: { create: { questionId, answer: true } },
					},
				});
				await tx.financeLedger.create({ data: { eventId: event.id } });
				const state = empty();
				syncFinanceSources(state, await readFinanceSources(tx, event.id));
				await writeLedger(tx, event.id, state);
				let restored = (await readLedger(tx, event.id))!.state;
				expect(restored.categories).toHaveLength(1);
				expect(
					syncFinanceSources(restored, await readFinanceSources(tx, event.id)),
				).toBe(false);
				await tx.commitmentQuestion.update({
					where: { id: questionId },
					data: { questionShort: "宿泊" },
				});
				expect(
					syncFinanceSources(restored, await readFinanceSources(tx, event.id)),
				).toBe(true);
				await writeLedger(tx, event.id, restored);
				restored = (await readLedger(tx, event.id))!.state;
				expect(restored.categories[0]).toMatchObject({
					id: questionId,
					questionId,
					name: "宿泊",
				});
				await rejected(tx, () =>
					tx.financeCategory.create({
						data: {
							eventId: event.id,
							id: "duplicate",
							questionId,
							name: "重複",
							baseAmount: 0,
						},
					}),
				);
				await tx.offkaiAnswer.deleteMany({ where: { eventId: event.id } });
				expect((await readLedger(tx, event.id))!.state.people).toHaveLength(1);
			}));
		it("別イベント参照・参照切れ・不正な入出金種別をDBで拒否", async () =>
			rollback(async (tx) => {
				const a = await createEvent(tx),
					b = await createEvent(tx);
				await tx.financeLedger.createMany({
					data: [{ eventId: a.id }, { eventId: b.id }],
				});
				await tx.financePerson.create({
					data: { eventId: a.id, id: "person", name: "A" },
				});
				await tx.financeCategory.create({
					data: { eventId: a.id, id: "day", name: "日", baseAmount: 1000 },
				});
				await rejected(tx, () =>
					tx.financeCharge.create({
						data: {
							eventId: b.id,
							id: "bad",
							personId: "person",
							categoryId: "day",
							title: "不正",
							amountOverride: 1000,
						},
					}),
				);
				await tx.financeCharge.create({
					data: {
						eventId: a.id,
						id: "charge",
						personId: "person",
						categoryId: "day",
						title: "参加費",
						amountOverride: null,
					},
				});
				await rejected(tx, () =>
					tx.financeCategory.delete({
						where: { eventId_id: { eventId: a.id, id: "day" } },
					}),
				);
				await rejected(tx, () =>
					tx.financePayment.create({
						data: {
							eventId: a.id,
							id: "bad",
							kind: "collection",
							personId: "person",
							amount: 1000,
							at: new Date(),
						},
					}),
				);
				await rejected(tx, () =>
					tx.financePayment.create({
						data: {
							eventId: a.id,
							id: "bad",
							kind: "collection",
							chargeId: "missing",
							amount: 1000,
							at: new Date(),
						},
					}),
				);
				expect(
					(
						await tx.financeLedger.updateMany({
							where: { eventId: a.id, revision: 0 },
							data: { revision: { increment: 1 } },
						})
					).count,
				).toBe(1);
				expect(
					(
						await tx.financeLedger.updateMany({
							where: { eventId: a.id, revision: 0 },
							data: { revision: { increment: 1 } },
						})
					).count,
				).toBe(0);
			}));
		it("Settlement旧区分・個別金額・徴収・確定返金・返金実績を移行", async () =>
			rollback(async (tx) => {
				const event = await createEvent(tx);
				const eventId = OffkaiEventIdSchema.parse(event.id);
				const user = await tx.user.findFirstOrThrow({ select: { id: true } });
				const q = uuidv7();
				await tx.commitmentQuestion.create({
					data: {
						id: q,
						eventId,
						question: "参加？",
						questionShort: "土泊",
						deadline: new Date(),
						description: "",
						capacity: 100,
						sortOrder: 0,
					},
				});
				const answer = await tx.offkaiAnswer.create({
					data: {
						eventId,
						userId: user.id,
						updatedBy: user.id,
						respondentName: "移行対象",
						preferenceAnswers: [],
						commitmentAnswers: { create: { questionId: q, answer: true } },
					},
				});
				await tx.eventFinance.create({
					data: {
						eventId,
						feeCalculationLockedAt: new Date(),
						settlementLockedAt: new Date(),
					},
				});
				const category = await tx.settlementCategory.create({
					data: {
						eventId,
						name: "土泊",
						commitmentQuestionId: q,
						baseParticipationFeeAmount: 10000,
						members: { create: { answerId: answer.id, amountOverride: 8000 } },
					},
				});
				await tx.participantFinance.create({
					data: {
						answerId: answer.id,
						chargeAmount: 8500,
						collectedAt: new Date(),
						refundAmount: 2000,
						refundedAt: new Date(),
						extraCharges: { create: { title: "帽子", amount: 500 } },
					},
				});
				await tx.settlementExpense.create({
					data: { categoryId: category.id, title: "宿代", amount: 6000 },
				});
				await tx.settlementIncome.create({
					data: { categoryId: category.id, title: "カンパ", amount: 1000 },
				});
				const preview = buildLegacyLedger(await readLegacyFinance(tx, eventId));
				expect(preview.categories).toHaveLength(1);
				expect(preview.categories[0]).toMatchObject({
					id: category.id,
					questionId: q,
				});
				expect(preview.charges.find((c) => c.categoryId)?.amount).toBe(8000);
				expect(preview.charges.find((c) => c.categoryId)?.usesBaseAmount).toBe(
					false,
				);
				await tx.financeLedger.create({ data: { eventId } });
				await writeLedger(tx, eventId, preview);
				const restored = (await readLedger(tx, eventId))!.state;
				expect(
					restored.payments
						.filter((p) => p.kind === "collection")
						.reduce((s, p) => s + p.amount, 0),
				).toBe(8500);
				expect(
					restored.payments
						.filter((p) => p.kind === "refund")
						.reduce((s, p) => s + p.amount, 0),
				).toBe(2000);
				expect(calculateFinanceLedger(restored).participants[0].remaining).toBe(
					// 最新実費 6,000 - カンパ 1,000 = 負担 5,000。
					// 参加費受領 8,000 - 返金済み 2,000 - 負担 5,000 = 追加返金 1,000。
					1000,
				);
				expect(
					calculateFinanceLedger(restored).participants[0].settlementStarted,
				).toBe(true);
				expect(restored.expenses[0].amount).toBe(6000);
				expect(restored.incomes[0].amount).toBe(1000);
				expect(restored.migrationNotes.join()).toContain("不明");
				expect(
					restored.payments.some(
						(p) => p.kind === "expense" || p.kind === "income",
					),
				).toBe(false);
				await rejected(tx, () =>
					tx.eventFinance.update({
						where: { eventId },
						data: { refundRoundingUnit: "TEN" },
					}),
				);
			}));
	},
);
