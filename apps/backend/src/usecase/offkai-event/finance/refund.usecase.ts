import type {
	GetEventRefundRequest,
	GetEventRefundResponse,
	Unbrand,
	UpdateParticipantRefundRequest,
	UpdateParticipantRefundNoteRequest,
	UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	prisma,
} from "../../../repository";
import { RefundPageAssembler } from "../../../service/refund.service";

export class RefundUsecase {
	constructor(
		readonly _eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly participantRepository = new ParticipantFinanceRepository(),
		private readonly pageAssembler = new RefundPageAssembler(),
	) {}

	async getPage(
		input: GetEventRefundRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "refund", level: "read" });
		return this.pageAssembler.build(input.eventId);
	}

	async updateParticipant(
		input: UpdateParticipantRefundRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "refund", level: "record" });
		const finance = await this.financeRepository.findByEventId(input.eventId);
		if (!finance.settlementLockedAt)
			throw new AppError(
				"VALIDATION_ERROR",
				"経費精算を確定してから返金してください。",
			);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant)
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		const now = new Date();
		const updated = runBusinessRule(() =>
			input.refunded
				? participant.markRefunded(now, viewerUserId)
				: participant.markUnrefunded(),
		);
		await prisma.$transaction(async (tx) => {
			if (input.refunded && !finance.refundStartedAt) {
				await new EventFinanceRepository(tx).save(
					runBusinessRule(() => finance.markRefundStarted(now)),
				);
			}
			await new ParticipantFinanceRepository(tx).save(input.eventId, updated);
		});
		return this.pageAssembler.build(input.eventId);
	}

	async updateParticipantNote(
		input: UpdateParticipantRefundNoteRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventRefundResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, {
			area: "refund",
			level: "record",
		});
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant)
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		await this.participantRepository.save(
			input.eventId,
			participant.changeRefundNote(input.note),
		);
		return this.pageAssembler.build(input.eventId);
	}

}
