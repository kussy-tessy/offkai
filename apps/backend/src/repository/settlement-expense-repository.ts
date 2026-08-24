import {
	SettlementExpense,
	type OffkaiEventId,
	type SettlementExpenseId,
	type SettlementCategoryId,
	type UserId,
} from "@offkai/core";
import type { FinanceDbClient } from "./finance-repository-shared";
import { prisma } from "./prisma";

export class SettlementExpenseRepository {
	constructor(private readonly client: FinanceDbClient = prisma) {}

	async findManyByEventId(
		eventId: OffkaiEventId,
	): Promise<SettlementExpense[]> {
		const records = await this.client.settlementExpense.findMany({
			where: { category: { eventId } },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			include: {
				recipients: {
					select: { amount: true, answer: { select: { userId: true } } },
				},
			},
		});
		return records.map((record) =>
			SettlementExpense.reconstruct({
				id: record.id as SettlementExpenseId,
				categoryId: record.categoryId as SettlementCategoryId,
				title: record.title,
				amount: record.amount,
				note: record.note,
				recipients: record.recipients.map((recipient) => ({
					userId: recipient.answer.userId as UserId,
					amount: recipient.amount,
				})),
			}),
		);
	}

	async findByEventAndId(
		eventId: OffkaiEventId,
		expenseId: SettlementExpenseId,
	): Promise<SettlementExpense | null> {
		return (
			(await this.findManyByEventId(eventId)).find(
				(expense) => expense.id === expenseId,
			) ?? null
		);
	}

	async save(
		eventId: OffkaiEventId,
		expense: SettlementExpense,
	): Promise<void> {
		const userIds = expense.recipients.map((recipient) => recipient.userId);
		const answers = await this.client.offkaiAnswer.findMany({
			where: { eventId, userId: { in: userIds } },
			select: { id: true, userId: true },
		});
		if (answers.length !== userIds.length)
			throw new Error("受取人に指定された参加者が見つかりません。");
		const answerIdByUserId = new Map(
			answers.map((answer) => [answer.userId, answer.id]),
		);
		const recipients = expense.recipients.map((recipient) => ({
			answerId: answerIdByUserId.get(recipient.userId)!,
			amount: recipient.amount,
		}));
		await this.client.settlementExpense.upsert({
			where: { id: expense.id },
			create: {
				id: expense.id,
				categoryId: expense.categoryId,
				title: expense.title,
				amount: expense.amount,
				note: expense.note,
				recipients: { create: recipients },
			},
			update: {
				title: expense.title,
				amount: expense.amount,
				note: expense.note,
				recipients: { deleteMany: {}, create: recipients },
			},
		});
	}

	async delete(
		eventId: OffkaiEventId,
		expenseId: SettlementExpenseId,
	): Promise<boolean> {
		return (
			(
				await this.client.settlementExpense.deleteMany({
					where: { id: expenseId, category: { eventId } },
				})
			).count > 0
		);
	}

	async hasByCategoryId(categoryId: SettlementCategoryId): Promise<boolean> {
		return (
			(await this.client.settlementExpense.count({ where: { categoryId } })) > 0
		);
	}
}
