import type {
	GetParticipantAnswerTableRequest,
	GetParticipantAnswerTableResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { getEventAuthorizationContext, hasStaffPermission, requireEventPermission } from "../../../authorization/staff-permissions";
import {
	OffkaiEventRepository,
	ParticipantAnswerTableRepository,
} from "../../../repository";
export async function getParticipantAnswerTable(
	input: GetParticipantAnswerTableRequest,
	userId: UserId,
): Promise<Unbrand<GetParticipantAnswerTableResponse>> {
	const events = new OffkaiEventRepository();
	const event = await events.findById(input.eventId);
	await requireEventPermission(event.id, userId, { area: "answerManagement", level: "read" });
	const context = await getEventAuthorizationContext(event.id, userId);
	const canEdit = context.role === "owner" || hasStaffPermission(context.permissions, { area: "answerManagement", level: "edit" });
	const canDelete = context.role === "owner" || hasStaffPermission(context.permissions, { area: "answerManagement", level: "delete" });
	return new ParticipantAnswerTableRepository().getPage(
		event.id,
		canEdit,
		canDelete,
	);
}
