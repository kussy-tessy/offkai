import {
	type AnswerId,
	type CommitmentAnswer,
	OffkaiAnswer,
	type OffkaiEventId,
	type PreferenceAnswer,
	type UserId,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class OffkaiAnswerRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findByEventAndUser(
		eventId: OffkaiEventId,
		userId: UserId,
	): Promise<OffkaiAnswer | null> {
		const record = await this.prisma.offkaiAnswer.findUnique({
			where: {
				eventId_userId: {
					eventId,
					userId,
				},
			},
		});

		if (!record) return null;

		return OffkaiAnswer.reconstruct({
			id: record.id as AnswerId,
			eventId: record.eventId as OffkaiEventId,
			userId: record.userId as UserId,
			commitmentAnswers:
				record.commitmentAnswers as unknown as CommitmentAnswer[],
			preferenceAnswers:
				record.preferenceAnswers as unknown as PreferenceAnswer[],
		});
	}

	async save(answer: OffkaiAnswer): Promise<void> {
		const props = {
			id: answer.id,
			eventId: answer.eventId,
			userId: answer.userId,
			commitmentAnswers: answer.commitmentAnswers,
			preferenceAnswers: answer.preferenceAnswers,
		};

		await this.prisma.$transaction(async (tx) => {
			const existing = await tx.offkaiAnswer.findUnique({
				where: {
					eventId_userId: {
						eventId: props.eventId,
						userId: props.userId,
					},
				},
			});

			if (existing) {
				// 履歴保存（インフラ責務）
				await tx.offkaiAnswerHistory.create({
					data: {
						offkaiAnswerId: existing.id,
						eventId: existing.eventId,
						userId: existing.userId,
						commitmentAnswers:
							existing.commitmentAnswers as unknown as CommitmentAnswer[],
						preferenceAnswers:
							existing.preferenceAnswers as unknown as PreferenceAnswer[],
					},
				});
			}

			await tx.offkaiAnswer.upsert({
				where: { id: props.id },
				create: props,
				update: props,
			});
		});
	}

	async delete(id: string): Promise<void> {
		await this.prisma.offkaiAnswer.delete({
			where: { id },
		});
	}
}
