import {
	type ExtraChargeId,
	type OffkaiEventId,
	ParticipantFinance,
	type PaymentAmount,
	type UserId,
} from "@offkai/core";
import type { FinanceDbClient } from "./finance-repository-shared";
import { prisma } from "./prisma";

export class ParticipantFinanceRepository {
	constructor(private readonly client: FinanceDbClient = prisma) {}

	async findManyByEventId(
		eventId: OffkaiEventId,
	): Promise<ParticipantFinance[]> {
		const answers = await this.client.offkaiAnswer.findMany({
			where: { eventId },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			select: {
				id: true,
				userId: true,
				finance: {
					select: {
						note: true,
						collectionNote: true,
						settlementNote: true,
						refundNote: true,
						chargeAmount: true,
						collectedAt: true,
						collectedByUserId: true,
						refundAmount: true,
						refundCalculatedAt: true,
						refundedAt: true,
						refundedByUserId: true,
						extraCharges: { orderBy: { createdAt: "asc" } },
					},
				},
			},
		});
		return answers.map((answer) =>
			this.toDomain(answer.userId ?? answer.id, answer.finance),
		);
	}

	async findByEventAndUser(
		eventId: OffkaiEventId,
		userId: UserId,
	): Promise<ParticipantFinance | null> {
		const answer = await this.client.offkaiAnswer.findFirst({
			where: { eventId, OR: [{ id: userId }, { userId }] },
			select: {
				id: true,
				userId: true,
				finance: {
					select: {
						note: true,
						collectionNote: true,
						settlementNote: true,
						refundNote: true,
						chargeAmount: true,
						collectedAt: true,
						collectedByUserId: true,
						refundAmount: true,
						refundCalculatedAt: true,
						refundedAt: true,
						refundedByUserId: true,
						extraCharges: { orderBy: { createdAt: "asc" } },
					},
				},
			},
		});
		return answer
			? this.toDomain(answer.userId ?? answer.id, answer.finance)
			: null;
	}

	async save(
		eventId: OffkaiEventId,
		finance: ParticipantFinance,
	): Promise<void> {
		const answer = await this.client.offkaiAnswer.findFirstOrThrow({
			where: {
				eventId,
				OR: [{ id: finance.userId }, { userId: finance.userId }],
			},
			select: { id: true, finance: { select: { chargeAmount: true } } },
		});
		await this.client.participantFinance.upsert({
			where: { answerId: answer.id },
			create: {
				answerId: answer.id,
				note: finance.note,
				collectionNote: finance.collectionNote,
				settlementNote: finance.settlementNote,
				refundNote: finance.refundNote,
				chargeAmount: finance.chargeAmount,
				collectedAt: finance.collectedAt,
				collectedByUserId: finance.collectedByUserId,
				refundAmount: finance.refundAmount,
				refundCalculatedAt: finance.refundCalculatedAt,
				refundedAt: finance.refundedAt,
				refundedByUserId: finance.refundedByUserId,
			},
			update: {
				note: finance.note,
				collectionNote: finance.collectionNote,
				settlementNote: finance.settlementNote,
				refundNote: finance.refundNote,
				chargeAmount: finance.chargeAmount,
				collectedAt:
					answer.finance?.chargeAmount !== finance.chargeAmount
						? null
						: finance.collectedAt,
				collectedByUserId:
					answer.finance?.chargeAmount !== finance.chargeAmount
						? null
						: finance.collectedByUserId,
				refundAmount: finance.refundAmount,
				refundCalculatedAt: finance.refundCalculatedAt,
				refundedAt: finance.refundedAt,
				refundedByUserId: finance.refundedByUserId,
			},
		});
		await this.client.participantExtraCharge.deleteMany({
			where: {
				answerId: answer.id,
				id: { notIn: finance.extraCharges.map((charge) => charge.id) },
			},
		});
		for (const charge of finance.extraCharges) {
			await this.client.participantExtraCharge.upsert({
				where: { id: charge.id },
				create: { ...charge, answerId: answer.id },
				update: {
					title: charge.title,
					amount: charge.amount,
					note: charge.note,
				},
			});
		}
	}

	private toDomain(
		userId: string,
		finance: {
			note: string | null;
			collectionNote: string | null;
			settlementNote: string | null;
			refundNote: string | null;
			chargeAmount: number;
			collectedAt: Date | null;
			collectedByUserId: string | null;
			refundAmount: number | null;
			refundCalculatedAt: Date | null;
			refundedAt: Date | null;
			refundedByUserId: string | null;
			extraCharges: Array<{
				id: string;
				title: string;
				amount: number;
				note: string | null;
			}>;
		} | null,
	): ParticipantFinance {
		return ParticipantFinance.reconstruct({
			userId: userId as UserId,
			note: finance?.note ?? null,
			collectionNote: finance?.collectionNote ?? null,
			settlementNote: finance?.settlementNote ?? null,
			refundNote: finance?.refundNote ?? null,
			chargeAmount: finance?.chargeAmount ?? 0,
			collectedAt: finance?.collectedAt ?? null,
			collectedByUserId: (finance?.collectedByUserId as UserId | null) ?? null,
			refundAmount: finance?.refundAmount ?? null,
			refundCalculatedAt: finance?.refundCalculatedAt ?? null,
			refundedAt: finance?.refundedAt ?? null,
			refundedByUserId: (finance?.refundedByUserId as UserId | null) ?? null,
			extraCharges: (finance?.extraCharges ?? []).map((charge) => ({
				id: charge.id as ExtraChargeId,
				title: charge.title,
				amount: charge.amount as PaymentAmount,
				note: charge.note,
			})),
		});
	}

	async clearRefundCalculationsByEventId(
		eventId: OffkaiEventId,
	): Promise<void> {
		await this.client.participantFinance.updateMany({
			where: { answer: { eventId } },
			data: {
				refundAmount: null,
				refundCalculatedAt: null,
				refundedAt: null,
				refundedByUserId: null,
			},
		});
	}
}
