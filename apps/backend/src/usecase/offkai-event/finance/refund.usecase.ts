import {
	type CalculateEventRefundRequest,
	type GetEventRefundRequest,
	type GetEventRefundResponse,
	type Unbrand,
	type UpdateParticipantRefundRequest,
	type UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	prisma,
} from "../../../repository";
import { RefundPageAssembler } from "../../../service/refund.service";

export class RefundUsecase {
	constructor(
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly participantRepository = new ParticipantFinanceRepository(),
		private readonly pageAssembler = new RefundPageAssembler(),
	) {}

	async getPage(
		input: GetEventRefundRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		return this.pageAssembler.build(input.eventId);
	}

	async calculate(
		input: CalculateEventRefundRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		const finance = await this.financeRepository.findByEventId(input.eventId);
		if (!finance.feeCalculationLockedAt)
			throw new AppError(
				"VALIDATION_ERROR",
				"参加費を確定してから返金額を計算してください。",
			);
		if (finance.refundLockedAt)
			throw new AppError(
				"VALIDATION_ERROR",
				"返金開始後は返金額を再計算できません。",
			);
		const page = await this.pageAssembler.build(input.eventId);
		if (page.negativeParticipantNames.length > 0) {
			throw new AppError(
				"VALIDATION_ERROR",
				`${page.negativeParticipantNames.join("、")}は最終精算がマイナスです。追加徴収への対応後に再計算してください。`,
			);
		}
		const amountByUserId = new Map(
			page.participants.map((participant) => [
				participant.userId,
				participant.proposedRefundAmount,
			]),
		);
		const calculatedAt = new Date();
		await prisma.$transaction(async (tx) => {
			const repository = new ParticipantFinanceRepository(tx);
			const participants = await repository.findManyByEventId(input.eventId);
			for (const participant of participants) {
				await repository.save(
					input.eventId,
					runBusinessRule(() =>
						participant.setRefundCalculation(
							amountByUserId.get(participant.userId) ?? 0,
							calculatedAt,
						),
					),
				);
			}
		});
		return this.pageAssembler.build(input.eventId);
	}

	async updateParticipant(
		input: UpdateParticipantRefundRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		const finance = await this.financeRepository.findByEventId(input.eventId);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant)
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		const now = new Date();
		const updated = runBusinessRule(() =>
			input.refunded
				? participant.markRefunded(now)
				: participant.markUnrefunded(),
		);
		await prisma.$transaction(async (tx) => {
			if (input.refunded && !finance.refundLockedAt) {
				await new EventFinanceRepository(tx).save(
					runBusinessRule(() => finance.lockRefund(now)),
				);
			}
			await new ParticipantFinanceRepository(tx).save(input.eventId, updated);
		});
		return this.pageAssembler.build(input.eventId);
	}

	private async authorize(
		eventId: GetEventRefundRequest["eventId"],
		userId: UserId,
	) {
		const event = await this.eventRepository.findById(eventId);
		const role = await this.eventRepository.findSeriesMemberRole(
			userId,
			event.seriesId,
		);
		if (!hasSeriesRole(role, "staff"))
			throw new AppError(
				"FORBIDDEN",
				"このオフ会の返金を管理する権限がありません。",
			);
	}
}
