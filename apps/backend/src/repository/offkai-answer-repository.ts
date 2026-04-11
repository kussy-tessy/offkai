import {
	type AnswerId,
	type AnswerRow,
	type CommitmentAnswer,
	type CommitmentQuestionHeader,
	OffkaiAnswer,
	type OffkaiDetail,
	OffkaiDetailSchema,
	type OffkaiEventId,
	type PreferenceAnswer,
	type PreferenceQuestionHeader,
	type Unbrand,
	type UserId,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class OffkaiAnswerRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findManyByEventId(
		eventId: OffkaiEventId,
	): Promise<Array<{ id: string; userId: string; commitmentAnswers: unknown }>> {
		return this.prisma.offkaiAnswer.findMany({
			where: { eventId },
			select: {
				id: true,
				userId: true,
				commitmentAnswers: true,
			},
		});
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

	async getDetail(eventId: OffkaiEventId): Promise<OffkaiDetail> {
		const event = await prisma.offkaiEvent.findUnique({
			where: { id: eventId },
			include: {
				answers: {
					include: {
						user: true,
					},
				},
			},
		});

		if (!event) {
			throw new Error(`オフ会が見つかりません: ${eventId}`);
		}

		const commitmentQuestions =
			event.commitmentQuestions as CommitmentQuestionHeader[];

		const preferenceQuestions =
			event.preferenceQuestions as PreferenceQuestionHeader[];

		const answers: Unbrand<AnswerRow>[] = event.answers.map((a) => ({
			user: {
				id: a.user.id,
				displayName: a.user.name,
			},
			commitmentAnswers: a.commitmentAnswers as AnswerRow["commitmentAnswers"],
			preferenceAnswers: a.preferenceAnswers as AnswerRow["preferenceAnswers"],
		}));

		const result: Unbrand<OffkaiDetail> = {
			offkai: {
				id: event.id,
				title: event.name,
				description: event.description ?? "",
				eventDate: event.eventDate.toISOString(),
			},
			commitmentQuestions,
			preferenceQuestions,
			answers,
		};

		return OffkaiDetailSchema.parse(result);
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

	async delete(id: AnswerId): Promise<void> {
		await this.prisma.offkaiAnswer.delete({
			where: { id },
		});
	}
}
