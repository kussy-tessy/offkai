import type {
	GetParticipantPaymentsRequest,
	GetParticipantPaymentsResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { requireEventPermission } from "../../../authorization/staff-permissions";
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
	await requireEventPermission(event.id, viewerUserId, { area: "feeCollection", level: "read" });

	return new ParticipantPaymentRepository().getPage(event.id);
}
