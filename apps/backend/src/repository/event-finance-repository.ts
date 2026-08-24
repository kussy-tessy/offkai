import {
	EventFinance,
	type OffkaiEventId,
	type PaymentAmount,
	type QuestionId,
	type RefundRoundingUnit,
	SettlementCategory,
	type SettlementCategoryId,
	type UserId,
} from "@offkai/core";
import type { Prisma } from "@prisma/client";
import type { FinanceDbClient } from "./finance-repository-shared";
import { prisma } from "./prisma";

const categoryInclude = {
	members: {
		select: {
			amountOverride: true,
			answer: { select: { id: true, userId: true } },
		},
	},
} satisfies Prisma.SettlementCategoryInclude;
type CategoryRecord = Prisma.SettlementCategoryGetPayload<{
	include: typeof categoryInclude;
}>;

export class EventFinanceRepository {
	constructor(private readonly client: FinanceDbClient = prisma) {}

	async existsByEventId(eventId: OffkaiEventId): Promise<boolean> {
		return (await this.client.eventFinance.count({ where: { eventId } })) > 0;
	}

	async findByEventId(eventId: OffkaiEventId): Promise<EventFinance> {
		const record = await this.client.eventFinance.findUnique({
			where: { eventId },
			include: {
				categories: { include: categoryInclude, orderBy: { createdAt: "asc" } },
			},
		});
		if (!record) return EventFinance.create(eventId);
		return EventFinance.reconstruct({
			eventId,
			refundRoundingUnit: toRoundingNumber(record.refundRoundingUnit),
			categories: record.categories.map(toSettlementCategory),
			feeCalculationLockedAt: record.feeCalculationLockedAt,
			collectionStartedAt: record.collectionStartedAt,
			refundLockedAt: record.refundLockedAt,
		});
	}

	async save(finance: EventFinance): Promise<void> {
		await this.client.eventFinance.upsert({
			where: { eventId: finance.eventId },
			create: {
				eventId: finance.eventId,
				refundRoundingUnit: toRoundingEnum(finance.refundRoundingUnit),
				feeCalculationLockedAt: finance.feeCalculationLockedAt,
				collectionStartedAt: finance.collectionStartedAt,
				refundLockedAt: finance.refundLockedAt,
			},
			update: {
				refundRoundingUnit: toRoundingEnum(finance.refundRoundingUnit),
				feeCalculationLockedAt: finance.feeCalculationLockedAt,
				collectionStartedAt: finance.collectionStartedAt,
				refundLockedAt: finance.refundLockedAt,
			},
		});
		await this.client.settlementCategory.deleteMany({
			where: {
				eventId: finance.eventId,
				id: { notIn: finance.categories.map((category) => category.id) },
			},
		});
		for (const category of finance.categories)
			await this.saveCategory(category);
	}

	private async saveCategory(category: SettlementCategory): Promise<void> {
		await this.client.settlementCategory.upsert({
			where: { id: category.id },
			create: {
				id: category.id,
				eventId: category.eventId,
				name: category.name,
				baseParticipationFeeAmount: category.baseParticipationFeeAmount,
				commitmentQuestionId: category.commitmentQuestionId,
			},
			update: {
				name: category.name,
				baseParticipationFeeAmount: category.baseParticipationFeeAmount,
				commitmentQuestionId: category.commitmentQuestionId,
			},
		});
		await this.client.settlementCategoryMember.deleteMany({
			where: { categoryId: category.id },
		});
		for (const member of category.members) {
			const answer = await this.client.offkaiAnswer.findFirstOrThrow({
				where: {
					eventId: category.eventId,
					OR: [{ id: member.userId }, { userId: member.userId }],
				},
				select: { id: true },
			});
			await this.client.settlementCategoryMember.upsert({
				where: {
					categoryId_answerId: { categoryId: category.id, answerId: answer.id },
				},
				create: {
					categoryId: category.id,
					answerId: answer.id,
					amountOverride: member.amountOverride,
				},
				update: { amountOverride: member.amountOverride },
			});
		}
	}
}

function toSettlementCategory(category: CategoryRecord): SettlementCategory {
	return SettlementCategory.reconstruct({
		id: category.id as SettlementCategoryId,
		eventId: category.eventId as OffkaiEventId,
		name: category.name,
		baseParticipationFeeAmount: category.baseParticipationFeeAmount,
		commitmentQuestionId: category.commitmentQuestionId as QuestionId | null,
		members: category.members.map((member) => ({
			userId: (member.answer.userId ?? member.answer.id) as UserId,
			amountOverride: member.amountOverride as PaymentAmount | null,
		})),
	});
}

function toRoundingNumber(value: PrismaRefundRoundingUnit): RefundRoundingUnit {
	return value === "TEN" ? 10 : value === "HUNDRED" ? 100 : 500;
}
function toRoundingEnum(value: RefundRoundingUnit): PrismaRefundRoundingUnit {
	return value === 10 ? "TEN" : value === 100 ? "HUNDRED" : "FIVE_HUNDRED";
}
type PrismaRefundRoundingUnit = "TEN" | "HUNDRED" | "FIVE_HUNDRED";
