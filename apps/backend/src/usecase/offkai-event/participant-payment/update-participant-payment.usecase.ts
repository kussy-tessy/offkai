import type {
	Unbrand,
	UpdateParticipantPaymentRequest,
	UpdateParticipantPaymentResponse,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
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
	await requireEventPermission(event.id, viewerUserId, { area: "feeCollection", level: "record" });

	const payment = await new ParticipantPaymentRepository().update(input);
	if (!payment) {
		throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
	}
	return payment;
}
