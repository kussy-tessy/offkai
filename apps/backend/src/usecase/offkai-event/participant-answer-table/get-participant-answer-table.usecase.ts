import type {
	GetParticipantAnswerTableRequest,
	GetParticipantAnswerTableResponse,
	Unbrand,
	UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
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
	const role = await events.findSeriesMemberRole(userId, event.seriesId);
	if (!hasSeriesRole(role, "staff"))
		throw new AppError(
			"FORBIDDEN",
			"このオフ会の回答表を見る権限がありません。",
		);
	return new ParticipantAnswerTableRepository().getPage(
		event.id,
		hasSeriesRole(role, "owner"),
	);
}
