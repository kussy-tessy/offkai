import {
	LegacyStaffPermissions,
	OffkaiEventIdSchema,
	UserIdSchema,
} from "@offkai/core";
import { PrismaClient } from "@prisma/client";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it, vi } from "vitest";

// Exercise actual transactions/persistence. Only authorization is stubbed; all
// fixtures belong to disposable events, removed in finally (never a user's event).
vi.mock("../../../repository/prisma", async () => ({
	prisma: new (await import("@prisma/client")).PrismaClient(),
}));
vi.mock("../../../authorization/staff-permissions", async (original) => ({
	...(await original<object>()),
	getEventAuthorizationContext: async () => ({
		role: "owner",
		isParticipant: true,
		permissions: LegacyStaffPermissions,
	}),
}));

import { prisma } from "../../../repository/prisma";
import { activateLedger, changeLedger, getLedger } from "./ledger.service";

async function fixture(
	run: (
		db: PrismaClient,
		eventId: ReturnType<typeof OffkaiEventIdSchema.parse>,
		userId: ReturnType<typeof UserIdSchema.parse>,
		questionId: string,
		answerId: string,
	) => Promise<void>,
) {
	const db = new PrismaClient();
	let eventId: string | undefined;
	try {
		const series = await db.series.findFirstOrThrow({ select: { id: true } });
		const user = await db.user.findFirstOrThrow({ select: { id: true } });
		eventId = uuidv7();
		const questionId = uuidv7();
		await db.offkaiEvent.create({
			data: {
				id: eventId,
				seriesId: series.id,
				name: "finance disposable integration fixture",
				eventStartDate: new Date(),
				eventEndDate: new Date(),
				applicationStartDate: new Date(),
				preferenceQuestions: [],
				commitmentQuestions: {
					create: {
						id: questionId,
						question: "参加？",
						questionShort: "土泊",
						deadline: new Date(),
						description: "",
						capacity: 100,
						sortOrder: 0,
					},
				},
			},
		});
		const answer = await db.offkaiAnswer.create({
			data: {
				eventId,
				userId: user.id,
				updatedBy: user.id,
				respondentName: "テスト対象",
				preferenceAnswers: [],
				commitmentAnswers: { create: { questionId, answer: true } },
			},
		});
		await run(
			db,
			OffkaiEventIdSchema.parse(eventId),
			UserIdSchema.parse(user.id),
			questionId,
			answer.id,
		);
	} finally {
		if (eventId)
			await db.$transaction(async (tx) => {
				await tx.offkaiAnswer.deleteMany({ where: { eventId } });
				await tx.offkaiEvent.delete({ where: { id: eventId } });
			});
		await db.$disconnect();
		await prisma.$disconnect();
	}
}

describe.skipIf(process.env.RUN_LEDGER_DB_TEST !== "1")(
	"実サービスからの初期化・編集・移行",
	() => {
		it(
			"同時初回アクセスでも区分は1件、再読込でも金額を維持",
			async () =>
				fixture(async (db, eventId, userId, questionId) => {
					const [first, second] = await Promise.all([
						getLedger(eventId, userId),
						getLedger(eventId, userId),
					]);
					expect(first.state.categories).toHaveLength(1);
					expect(second.state.categories).toEqual(first.state.categories);
					expect(await db.financeCategory.count({ where: { eventId } })).toBe(
						1,
					);
					expect(
						await db.financeLedgerHistory.count({ where: { eventId } }),
					).toBe(1);
					let page = await changeLedger(eventId, userId, {
						revision: first.revision,
						requestId: uuidv7(),
						action: "put",
						resource: "categories",
						value: { ...first.state.categories[0], baseAmount: 10000 },
					});
					page = await changeLedger(eventId, userId, {
						revision: page.revision,
						requestId: uuidv7(),
						action: "createCategoryCharges",
					});
					const chargeId = page.state.charges[0].id;
					page = await changeLedger(eventId, userId, {
						revision: page.revision,
						requestId: uuidv7(),
						action: "collectPlanned",
						personId: userId,
					});
					page = await changeLedger(eventId, userId, {
						revision: page.revision,
						requestId: uuidv7(),
						action: "put",
						resource: "categories",
						value: { ...page.state.categories[0], baseAmount: 5000 },
					});
					page = await getLedger(eventId, userId);
					expect(page.state.categories).toHaveLength(1);
					expect(page.state.categories[0].baseAmount).toBe(5000);
					expect(page.state.charges[0]).toMatchObject({
						id: chargeId,
						amount: 5000,
						usesBaseAmount: true,
					});
					expect(page.state.payments[0].amount).toBe(10000);
					const saved = await db.financeCharge.findFirstOrThrow({
						where: { eventId, id: chargeId },
					});
					expect(saved.amountOverride).toBeNull();
					await db.commitmentQuestion.update({
						where: { id: questionId },
						data: { questionShort: "宿泊" },
					});
					const renamed = await getLedger(eventId, userId);
					expect(renamed.state.categories[0]).toMatchObject({
						id: questionId,
						name: "宿泊",
						baseAmount: 5000,
					});
					const count = await db.financeLedgerHistory.count({
						where: { eventId },
					});
					await getLedger(eventId, userId);
					expect(
						await db.financeLedgerHistory.count({ where: { eventId } }),
					).toBe(count);
					const before = await db.financeLedger.findUniqueOrThrow({
						where: { eventId },
					});
					await expect(
						changeLedger(eventId, userId, {
							revision: renamed.revision,
							requestId: uuidv7(),
							action: "remove",
							resource: "charges",
							id: chargeId,
						}),
					).rejects.toThrow();
					expect(
						(await db.financeLedger.findUniqueOrThrow({ where: { eventId } }))
							.revision,
					).toBe(before.revision);
					expect(
						await db.financeLedgerHistory.count({ where: { eventId } }),
					).toBe(count);
					expect(await db.financeCharge.count({ where: { eventId } })).toBe(1);
				}),
			30000,
		);
		it(
			"旧方式は勝手に初期化せず、プレビュー確認後に同じ区分IDで移行",
			async () =>
				fixture(async (db, eventId, userId, questionId, answerId) => {
					await db.eventFinance.create({ data: { eventId } });
					const old = await db.settlementCategory.create({
						data: {
							eventId,
							name: "土泊",
							commitmentQuestionId: questionId,
							baseParticipationFeeAmount: 10000,
							members: { create: { answerId, amountOverride: null } },
						},
					});
					const preview = await getLedger(eventId, userId);
					expect(preview.active).toBe(false);
					expect(preview.fingerprint).toBeTruthy();
					expect(
						await db.financeLedger.findUnique({ where: { eventId } }),
					).toBeNull();
					await expect(
						activateLedger(eventId, userId, "stale"),
					).rejects.toMatchObject({ code: "CONFLICT" });
					expect(
						await db.financeLedger.findUnique({ where: { eventId } }),
					).toBeNull();
					const active = await activateLedger(
						eventId,
						userId,
						preview.fingerprint!,
					);
					expect(active.active).toBe(true);
					expect(active.state.categories).toHaveLength(1);
					expect(active.state.categories[0].id).toBe(old.id);
					expect(active.state.charges[0]).toMatchObject({
						categoryId: old.id,
						amount: 10000,
						usesBaseAmount: true,
					});
					expect(await db.financeCategory.count({ where: { eventId } })).toBe(
						1,
					);
					expect((await getLedger(eventId, userId)).state.categories).toEqual(
						active.state.categories,
					);
					await expect(
						activateLedger(eventId, userId, preview.fingerprint!),
					).rejects.toMatchObject({ code: "CONFLICT" });
				}),
			30000,
		);
	},
);

describe.skipIf(process.env.RUN_LEDGER_DB_TEST !== "1")(
	"回答変更と参加者別保存の永続化",
	() => {
		it(
			"請求は自動生成され、一括保存・不参加・再参加でも個別額と入金を維持",
			async () =>
				fixture(async (db, eventId, userId, questionId, answerId) => {
					let page = await getLedger(eventId, userId);
					expect(page.state.charges).toHaveLength(1);
					expect(page.state.charges[0].isBase).toBe(true);
					page = await changeLedger(eventId, userId, {
						revision: page.revision,
						requestId: uuidv7(),
						action: "put",
						resource: "categories",
						value: { ...page.state.categories[0], baseAmount: 4000 },
					});
					const id = page.state.charges[0].id;
					const before = page.revision;
					page = await changeLedger(eventId, userId, {
						revision: before,
						requestId: uuidv7(),
						action: "participantCharges",
						personId: userId,
						baseChanges: [
							{
								categoryId: questionId,
								amountOverride: 3000,
								note: "途中参加",
							},
						],
						extras: [
							{
								id: "hat",
								categoryId: null,
								title: "帽子",
								amount: 500,
								note: "",
							},
						],
					});
					expect(page.revision).toBe(before + 1);
					expect(page.state.charges.find((c) => c.id === id)).toMatchObject({
						amount: 3000,
						usesBaseAmount: false,
						isBase: true,
					});
					expect(
						(
							await db.financeLedgerHistory.findUniqueOrThrow({
								where: {
									eventId_revision: { eventId, revision: page.revision },
								},
							})
						).action,
					).toBe("participantCharges");
					page = await changeLedger(eventId, userId, {
						revision: page.revision,
						requestId: uuidv7(),
						action: "collectPlanned",
						personId: userId,
					});
					const payments = page.state.payments;
					await db.commitmentAnswer.update({
						where: { answerId_questionId: { answerId, questionId } },
						data: { answer: false },
					});
					page = await getLedger(eventId, userId);
					expect(
						page.calculation.charges.find((c) => c.id === id),
					).toMatchObject({ amount: 0, received: 3000 });
					expect(page.state.payments).toEqual(payments);
					expect(
						(
							await db.financeCharge.findUniqueOrThrow({
								where: { eventId_id: { eventId, id } },
							})
						).amountOverride,
					).toBe(3000);
					const revision = page.revision;
					await expect(
						changeLedger(eventId, userId, {
							revision,
							requestId: uuidv7(),
							action: "participantCharges",
							personId: userId,
							baseChanges: [
								{ categoryId: questionId, amountOverride: 0, note: "" },
							],
							extras: [],
						}),
					).rejects.toThrow();
					expect(
						(await db.financeLedger.findUniqueOrThrow({ where: { eventId } }))
							.revision,
					).toBe(revision);
					expect(await db.financeCharge.count({ where: { eventId } })).toBe(2);
					await db.commitmentAnswer.update({
						where: { answerId_questionId: { answerId, questionId } },
						data: { answer: true },
					});
					page = await getLedger(eventId, userId);
					expect(
						page.calculation.charges.find((c) => c.id === id)?.amount,
					).toBe(3000);
					expect(page.state.payments).toEqual(payments);
				}),
			30000,
		);
	},
);
