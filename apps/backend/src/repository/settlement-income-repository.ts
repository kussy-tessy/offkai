import {
	SettlementIncome,
	type OffkaiEventId,
	type SettlementCategoryId,
	type SettlementIncomeId,
} from "@offkai/core";
import type { FinanceDbClient } from "./finance-repository-shared";
import { prisma } from "./prisma";

export class SettlementIncomeRepository {
	constructor(private readonly client: FinanceDbClient = prisma) {}

	async findManyByEventId(eventId: OffkaiEventId): Promise<SettlementIncome[]> {
		const records = await this.client.settlementIncome.findMany({
			where: { category: { eventId } },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});
		return records.map((record) =>
			SettlementIncome.reconstruct({
				id: record.id as SettlementIncomeId,
				categoryId: record.categoryId as SettlementCategoryId,
				title: record.title,
				amount: record.amount,
				note: record.note,
			}),
		);
	}

	async findByEventAndId(
		eventId: OffkaiEventId,
		incomeId: SettlementIncomeId,
	): Promise<SettlementIncome | null> {
		const record = await this.client.settlementIncome.findFirst({
			where: { id: incomeId, category: { eventId } },
		});
		return record
			? SettlementIncome.reconstruct({
					id: record.id as SettlementIncomeId,
					categoryId: record.categoryId as SettlementCategoryId,
					title: record.title,
					amount: record.amount,
					note: record.note,
				})
			: null;
	}

	async save(income: SettlementIncome): Promise<void> {
		await this.client.settlementIncome.upsert({
			where: { id: income.id },
			create: {
				id: income.id,
				categoryId: income.categoryId,
				title: income.title,
				amount: income.amount,
				note: income.note,
			},
			update: { title: income.title, amount: income.amount, note: income.note },
		});
	}

	async delete(
		eventId: OffkaiEventId,
		incomeId: SettlementIncomeId,
	): Promise<boolean> {
		return (
			(
				await this.client.settlementIncome.deleteMany({
					where: { id: incomeId, category: { eventId } },
				})
			).count > 0
		);
	}

	async hasByCategoryId(categoryId: SettlementCategoryId): Promise<boolean> {
		return (
			(await this.client.settlementIncome.count({ where: { categoryId } })) > 0
		);
	}
}
