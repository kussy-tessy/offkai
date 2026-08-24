import {
	BringingKigurumiSchema,
	type GetParticipantAnswerTableResponse,
	GetParticipantAnswerTableResponseSchema,
	type OffkaiEventId,
	PreferenceAnswerSchema,
	type Unbrand,
} from "@offkai/core";
import { AppError } from "../app-error";
import { toDomainCommitmentAnswer } from "./commitment-mapper";
import { prisma } from "./prisma";
export class ParticipantAnswerTableRepository {
	async getPage(
		eventId: OffkaiEventId,
		canEditAnswers: boolean,
	): Promise<Unbrand<GetParticipantAnswerTableResponse>> {
		const event = await prisma.offkaiEvent.findUnique({
			where: { id: eventId },
			select: {
				commitmentQuestions: {
					where: { archivedAt: null },
					orderBy: { sortOrder: "asc" },
					select: { id: true, questionShort: true },
				},
				preferenceQuestions: true,
				askBringingKigurumi: true,
				answers: {
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
					select: {
						userId: true,
						respondentName: true,
						commitmentAnswers: {
							where: { question: { archivedAt: null } },
							select: { questionId: true, answer: true },
						},
						preferenceAnswers: true,
						bringingKigurumis: true,
					},
				},
			},
		});
		if (!event)
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		const cq = event.commitmentQuestions;
		const pq = event.preferenceQuestions as Array<{
			id: string;
			question: string;
		}>;
		return GetParticipantAnswerTableResponseSchema.parse({
			canEditAnswers,
			commitmentQuestions: cq.map((q) => ({
				id: q.id,
				question: q.questionShort,
			})),
			preferenceQuestions: pq,
			askBringingKigurumi: event.askBringingKigurumi,
			participants: event.answers.map((a) => ({
				userId: a.userId,
				displayName: a.respondentName,
				commitmentAnswers: Object.fromEntries(
					a.commitmentAnswers
						.map(toDomainCommitmentAnswer)
						.map((x) => [x.questionId, x.answer]),
				),
				preferenceAnswers: Object.fromEntries(
					PreferenceAnswerSchema.array()
						.parse(a.preferenceAnswers)
						.map((x) => [x.questionId, x.answer]),
				),
				bringingKigurumis: BringingKigurumiSchema.array().parse(
					a.bringingKigurumis,
				),
			})),
		});
	}
}
