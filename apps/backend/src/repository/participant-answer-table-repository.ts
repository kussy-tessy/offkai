import {
	BringingKigurumiSchema,
	CommitmentAnswerSchema,
	GetParticipantAnswerTableResponseSchema,
	PreferenceAnswerSchema,
	type GetParticipantAnswerTableResponse,
	type OffkaiEventId,
	type Unbrand,
} from "@offkai/core";
import { AppError } from "../app-error";
import { prisma } from "./prisma";
export class ParticipantAnswerTableRepository {
	async getPage(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetParticipantAnswerTableResponse>> {
		const event = await prisma.offkaiEvent.findUnique({
			where: { id: eventId },
			select: {
				commitmentQuestions: true,
				preferenceQuestions: true,
				askBringingKigurumi: true,
				answers: {
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
					select: {
						userId: true,
						commitmentAnswers: true,
						preferenceAnswers: true,
						bringingKigurumis: true,
						user: { select: { name: true } },
					},
				},
			},
		});
		if (!event)
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		const cq = event.commitmentQuestions as Array<{
			id: string;
			questionShort: string;
		}>;
		const pq = event.preferenceQuestions as Array<{
			id: string;
			question: string;
		}>;
		return GetParticipantAnswerTableResponseSchema.parse({
			commitmentQuestions: cq.map((q) => ({
				id: q.id,
				question: q.questionShort,
			})),
			preferenceQuestions: pq,
			askBringingKigurumi: event.askBringingKigurumi,
			participants: event.answers.map((a) => ({
				userId: a.userId,
				displayName: a.user.name,
				commitmentAnswers: Object.fromEntries(
					CommitmentAnswerSchema.array()
						.parse(a.commitmentAnswers)
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
