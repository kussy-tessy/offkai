import type {
	GetParticipantPaymentsRequest,
	GetParticipantPaymentsResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import {
	OffkaiEventRepository,
	ParticipantPaymentRepository,
} from "../../../repository";

export async function getParticipantPayments(
	input: GetParticipantPaymentsRequest,
	viewerUserId: UserId,
): Promise<Unbrand<GetParticipantPaymentsResponse>> {
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

	return new ParticipantPaymentRepository().getPage(event.id);
}
