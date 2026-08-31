import type {
	ParticipantGuideResponse,
	ParticipantGuideRouteParams,
	Unbrand,
	UpdateParticipantGuideRequest,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { OffkaiEventRepository } from "../../../repository";

export async function getParticipantGuide(
	input: ParticipantGuideRouteParams,
	userId: UserId,
): Promise<Unbrand<ParticipantGuideResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	const [seriesRole, isParticipant] = await Promise.all([
		repository.findSeriesMemberRole(userId, event.seriesId),
		repository.isParticipant(event.id, userId),
	]);

	if (!isParticipant && !hasSeriesRole(seriesRole, "owner")) {
		throw new AppError(
			"FORBIDDEN",
			"参加者向け情報を閲覧する権限がありません。",
		);
	}

	return { description: event.participantDescription };
}

export async function updateParticipantGuide(
	input: UpdateParticipantGuideRequest,
	userId: UserId,
): Promise<Unbrand<ParticipantGuideResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.eventId);
	await requireEventPermission(event.id, userId, { area: "eventManagement" });

	const updated = event.updateParticipantDescription(input.description);
	await repository.updateParticipantDescription(updated);
	return { description: updated.participantDescription };
}
