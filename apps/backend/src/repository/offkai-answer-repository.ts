import {
	type AnswerId,
	type AnswerRow,
	type BringingKigurumi,
	BringingKigurumiSchema,
	type CommitmentAnswer,
	CommitmentAnswerSchema,
	type CommitmentQuestionHeader,
	OffkaiAnswer,
	type OffkaiDetail,
	OffkaiDetailSchema,
	type OffkaiEventId,
	type PreferenceAnswer,
	PreferenceAnswerSchema,
	type PreferenceQuestionHeader,
	type Unbrand,
	type UserId,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../app-error";
import { prisma } from "./prisma";

export class OffkaiAnswerRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findManyByEventId(
		eventId: OffkaiEventId,
	): Promise<
		Array<{ id: string; userId: string; commitmentAnswers: unknown }>
	> {
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
			bringingKigurumis:
				record.bringingKigurumis as unknown as BringingKigurumi[],
		});
	}

	async getOffkaiDetail(
		eventId: OffkaiEventId,
		viewer: Unbrand<OffkaiDetail>["viewer"],
		participantsAccess: Unbrand<OffkaiDetail>["participantsAccess"],
	): Promise<OffkaiDetail> {
		const event = await prisma.offkaiEvent.findUnique({
			where: { id: eventId },
			include: {
				answers: {
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
					include: {
						user: true,
					},
				},
			},
		});

		if (!event) {
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		}

		const commitmentQuestions =
			event.commitmentQuestions as CommitmentQuestionHeader[];

		const preferenceQuestions =
			event.preferenceQuestions as PreferenceQuestionHeader[];

		const canViewPrivateAnswers = viewer.permissions.canViewPrivateAnswers;
		const answerRows: Unbrand<AnswerRow>[] = event.answers.map((a) => ({
			user: {
				id: a.user.id,
				displayName: a.user.name,
			},
			createdAt: a.createdAt.toISOString(),
			commitmentAnswers: this.toCommitmentAnswerRecord(a.commitmentAnswers),
			preferenceAnswers: canViewPrivateAnswers
				? this.toPreferenceAnswerRecord(a.preferenceAnswers)
				: null,
			bringingKigurumis: canViewPrivateAnswers
				? this.toBringingKigurumis(a.bringingKigurumis)
				: null,
		}));
		const commitmentQuestionsWithCounts = commitmentQuestions.map((question) => ({
			...question,
			yesCount: answerRows.filter(
				(answer) => answer.commitmentAnswers[question.id] === "yes",
			).length,
		}));

		const result: Unbrand<OffkaiDetail> = {
			offkai: {
				id: event.id,
				title: event.name,
				description: event.description ?? "",
				eventPeriod: {
					startDate: event.eventStartDate.toISOString().slice(0, 10),
					endDate: event.eventEndDate.toISOString().slice(0, 10),
				},
				applicationStartDate: event.applicationStartDate.toISOString(),
				askBringingKigurumi: event.askBringingKigurumi,
			},
			viewer,
			participantsAccess,
			commitmentQuestions: commitmentQuestionsWithCounts,
			preferenceQuestions: canViewPrivateAnswers ? preferenceQuestions : null,
			answers: participantsAccess.granted ? answerRows : null,
		};

		return OffkaiDetailSchema.parse(result);
	}

	async save(answer: OffkaiAnswer, updatedBy: UserId): Promise<void> {
		const props = {
			id: answer.id,
			eventId: answer.eventId,
			userId: answer.userId,
			updatedBy,
			commitmentAnswers: answer.commitmentAnswers,
			preferenceAnswers: answer.preferenceAnswers,
			bringingKigurumis: answer.bringingKigurumis,
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
						bringingKigurumis:
							existing.bringingKigurumis as unknown as BringingKigurumi[],
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

	private toCommitmentAnswerRecord(
		value: unknown,
	): AnswerRow["commitmentAnswers"] {
		const items = CommitmentAnswerSchema.array().parse(value);
		return Object.fromEntries(items.map((i) => [i.questionId, i.answer]));
	}

	private toPreferenceAnswerRecord(
		value: unknown,
	): AnswerRow["preferenceAnswers"] {
		const items = PreferenceAnswerSchema.array().parse(value);
		return Object.fromEntries(items.map((i) => [i.questionId, i.answer]));
	}

	private toBringingKigurumis(value: unknown): BringingKigurumi[] {
		return BringingKigurumiSchema.array().parse(value ?? []);
	}
}
