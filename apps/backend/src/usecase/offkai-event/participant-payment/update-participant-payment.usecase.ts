import type {
	Unbrand,
	UpdateParticipantPaymentRequest,
	UpdateParticipantPaymentResponse,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import {
	OffkaiEventRepository,
	ParticipantPaymentRepository,
} from "../../../repository";

export async function updateParticipantPayment(
	input: UpdateParticipantPaymentRequest,
	viewerUserId: UserId,
): Promise<Unbrand<UpdateParticipantPaymentResponse>> {
	const eventRepository = new OffkaiEventRepository();
	const event = await eventRepository.findById(input.eventId);
	const seriesRole = await eventRepository.findSeriesMemberRole(
		viewerUserId,
		event.seriesId,
	);
	if (!hasSeriesRole(seriesRole, "staff")) {
		throw new AppError(
			"FORBIDDEN",
			"このオフ会の金銭を管理する権限がありません。",
		);
	}

	const payment = await new ParticipantPaymentRepository().update(input);
	if (!payment) {
		throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
	}
	return payment;
}
