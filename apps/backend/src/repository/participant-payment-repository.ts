import {
	CommitmentAnswerSchema,
	GetParticipantPaymentsResponseSchema,
	type GetParticipantPaymentsResponse,
	type OffkaiEventId,
	type PaymentAmount,
	type Unbrand,
	type UpdateParticipantPaymentResponse,
	type UserId,
} from "@offkai/core";
import { AppError } from "../app-error";
import { prisma } from "./prisma";

export class ParticipantPaymentRepository {
	async getPage(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetParticipantPaymentsResponse>> {
		const event = await prisma.offkaiEvent.findUnique({
			where: { id: eventId },
			select: {
				commitmentQuestions: true,
				answers: {
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
					select: {
						userId: true,
						commitmentAnswers: true,
						user: { select: { name: true } },
						payment: {
							select: {
								amount: true,
								collected: true,
							},
						},
					},
				},
			},
		});

		if (!event) {
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		}

		const questions = event.commitmentQuestions as Array<{
			id: string;
			questionShort: string;
		}>;

		return GetParticipantPaymentsResponseSchema.parse({
			commitmentQuestions: questions.map((question) => ({
				id: question.id,
				questionShort: question.questionShort,
			})),
			participants: event.answers.map((answer) => ({
				userId: answer.userId,
				displayName: answer.user.name,
				commitmentAnswers: this.toCommitmentAnswerRecord(
					answer.commitmentAnswers,
				),
				amount: answer.payment?.amount ?? 0,
				collected: answer.payment?.collected ?? false,
			})),
		});
	}

	async update(input: {
		eventId: OffkaiEventId;
		userId: UserId;
		amount: PaymentAmount;
		collected: boolean;
	}): Promise<Unbrand<UpdateParticipantPaymentResponse> | null> {
		const answer = await prisma.offkaiAnswer.findUnique({
			where: {
				eventId_userId: {
					eventId: input.eventId,
					userId: input.userId,
				},
			},
			select: {
				id: true,
				userId: true,
				commitmentAnswers: true,
				user: { select: { name: true } },
			},
		});
		if (!answer) return null;

		const payment = await prisma.participantPayment.upsert({
			where: { answerId: answer.id },
			create: {
				answerId: answer.id,
				amount: input.amount,
				collected: input.collected,
			},
			update: {
				amount: input.amount,
				collected: input.collected,
			},
		});

		return {
			userId: answer.userId,
			displayName: answer.user.name,
			commitmentAnswers: this.toCommitmentAnswerRecord(
				answer.commitmentAnswers,
			),
			amount: payment.amount,
			collected: payment.collected,
		};
	}

	private toCommitmentAnswerRecord(value: unknown) {
		const answers = CommitmentAnswerSchema.array().parse(value);
		return Object.fromEntries(
			answers.map((answer) => [answer.questionId, answer.answer]),
		);
	}
}
