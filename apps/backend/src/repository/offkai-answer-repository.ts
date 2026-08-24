import {
	type AnswerId,
	type AnswerRow,
	type BringingKigurumi,
	BringingKigurumiSchema,
	type CommitmentAnswer,
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
import {
	toDomainCommitmentAnswer,
	toPersistenceCommitmentAnswer,
} from "./commitment-mapper";
import { prisma } from "./prisma";

export class OffkaiAnswerRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findManyByEventId(eventId: OffkaiEventId): Promise<
		Array<{
			id: string;
			userId: string | null;
			commitmentAnswers: CommitmentAnswer[];
		}>
	> {
		return this.prisma.offkaiAnswer
			.findMany({
				where: { eventId },
				select: {
					id: true,
					userId: true,
					commitmentAnswers: {
						where: { question: { archivedAt: null } },
						select: { questionId: true, answer: true },
						orderBy: { question: { sortOrder: "asc" } },
					},
				},
			})
			.then((records) =>
				records.map((record) => ({
					...record,
					commitmentAnswers: record.commitmentAnswers.map(
						toDomainCommitmentAnswer,
					),
				})),
			);
	}

	async findUserIdsAnsweredYes(
		eventId: OffkaiEventId,
		questionId: string,
	): Promise<UserId[]> {
		const answers = await this.prisma.commitmentAnswer.findMany({
			where: {
				questionId,
				answer: true,
				answerRecord: { eventId },
			},
			select: { answerRecord: { select: { id: true, userId: true } } },
		});
		return answers.map(
			(answer) =>
				(answer.answerRecord.userId ?? answer.answerRecord.id) as UserId,
		);
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
			include: {
				commitmentAnswers: {
					where: { question: { archivedAt: null } },
					select: { questionId: true, answer: true },
					orderBy: { question: { sortOrder: "asc" } },
				},
			},
		});

		if (!record) return null;

		return OffkaiAnswer.reconstruct({
			id: record.id as AnswerId,
			eventId: record.eventId as OffkaiEventId,
			userId: record.userId as UserId,
			respondentName: record.respondentName,
			commitmentAnswers: record.commitmentAnswers.map(toDomainCommitmentAnswer),
			preferenceAnswers:
				record.preferenceAnswers as unknown as PreferenceAnswer[],
			bringingKigurumis:
				record.bringingKigurumis as unknown as BringingKigurumi[],
		});
	}

	async findById(id: AnswerId): Promise<OffkaiAnswer | null> {
		const record = await this.prisma.offkaiAnswer.findUnique({
			where: { id },
			include: {
				commitmentAnswers: {
					where: { question: { archivedAt: null } },
					select: { questionId: true, answer: true },
					orderBy: { question: { sortOrder: "asc" } },
				},
			},
		});
		if (!record) return null;
		return OffkaiAnswer.reconstruct({
			id: record.id as AnswerId,
			eventId: record.eventId as OffkaiEventId,
			userId: record.userId as UserId | null,
			respondentName: record.respondentName,
			commitmentAnswers: record.commitmentAnswers.map(toDomainCommitmentAnswer),
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
				commitmentQuestions: {
					where: { archivedAt: null },
					orderBy: { sortOrder: "asc" },
				},
				answers: {
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
					include: {
						commitmentAnswers: {
							where: { question: { archivedAt: null } },
							select: { questionId: true, answer: true },
						},
					},
				},
			},
		});

		if (!event) {
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		}

		const commitmentQuestions: Omit<CommitmentQuestionHeader, "yesCount">[] =
			event.commitmentQuestions.map((question) => ({
				id: question.id as CommitmentQuestionHeader["id"],
				questionShort: question.questionShort,
				deadline: question.deadline.toISOString(),
				capacity: question.capacity as CommitmentQuestionHeader["capacity"],
				required: question.required,
			}));

		const preferenceQuestions =
			event.preferenceQuestions as PreferenceQuestionHeader[];

		const canViewPrivateAnswers = viewer.permissions.canViewPrivateAnswers;
		const answerRows: Unbrand<AnswerRow>[] = event.answers.map((a) => ({
			user: {
				id: a.userId ?? a.id,
				displayName: a.respondentName,
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
		const commitmentQuestionsWithCounts = commitmentQuestions.map(
			(question) => ({
				...question,
				yesCount: answerRows.filter(
					(answer) => answer.commitmentAnswers[question.id] === "yes",
				).length,
			}),
		);

		const result: Unbrand<OffkaiDetail> = {
			offkai: {
				id: event.id,
				title: event.name,
				description: event.description ?? "",
				participantDescription: viewer.permissions.canViewParticipantDescription
					? (event.participantDescription ?? "")
					: null,
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
			preferenceAnswers: answer.preferenceAnswers,
			bringingKigurumis: answer.bringingKigurumis,
		};

		await this.prisma.$transaction(async (tx) => {
			const existing = await tx.offkaiAnswer.findFirst({
				where: props.userId
					? { eventId: props.eventId, userId: props.userId }
					: { id: props.id, eventId: props.eventId, userId: null },
				include: {
					commitmentAnswers: {
						select: { questionId: true, answer: true },
						orderBy: { question: { sortOrder: "asc" } },
					},
				},
			});

			if (existing) {
				await tx.offkaiAnswerHistory.create({
					data: {
						offkaiAnswerId: existing.id,
						eventId: existing.eventId,
						userId: existing.userId,
						commitmentAnswers: existing.commitmentAnswers.map(
							toDomainCommitmentAnswer,
						),
						preferenceAnswers:
							existing.preferenceAnswers as unknown as PreferenceAnswer[],
						bringingKigurumis:
							existing.bringingKigurumis as unknown as BringingKigurumi[],
					},
				});
			}

			const respondentName = existing
				? props.userId
					? existing.respondentName
					: (answer.respondentName ?? existing.respondentName)
				: (answer.respondentName ??
					(
						await tx.user.findUniqueOrThrow({
							where: { id: props.userId! },
							select: { name: true },
						})
					).name);

			await tx.offkaiAnswer.upsert({
				where: { id: props.id },
				create: { ...props, respondentName },
				update: {
					...props,
					...(props.userId === null ? { respondentName } : {}),
				},
			});

			await tx.commitmentAnswer.deleteMany({
				where: {
					answerId: props.id,
					question: { archivedAt: null },
				},
			});
			await tx.commitmentAnswer.createMany({
				data: answer.commitmentAnswers.map((item) => ({
					answerId: props.id,
					questionId: item.questionId,
					answer: toPersistenceCommitmentAnswer(item.answer),
				})),
			});
		});
	}

	async hasFinancialData(id: AnswerId): Promise<boolean> {
		const answer = await this.prisma.offkaiAnswer.findUnique({
			where: { id },
			select: {
				finance: { select: { answerId: true } },
				payment: { select: { answerId: true } },
				settlementCategoryMembers: { select: { answerId: true }, take: 1 },
				settlementExpenseRecipients: { select: { answerId: true }, take: 1 },
			},
		});
		return Boolean(
			answer &&
				(answer.finance ||
					answer.payment ||
					answer.settlementCategoryMembers.length ||
					answer.settlementExpenseRecipients.length),
		);
	}

	async delete(id: AnswerId): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			await tx.offkaiAnswerHistory.deleteMany({
				where: { offkaiAnswerId: id },
			});
			await tx.offkaiAnswer.delete({ where: { id } });
		});
	}

	private toCommitmentAnswerRecord(
		value: Array<{ questionId: string; answer: boolean | null }>,
	): AnswerRow["commitmentAnswers"] {
		const items = value.map(toDomainCommitmentAnswer);
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
