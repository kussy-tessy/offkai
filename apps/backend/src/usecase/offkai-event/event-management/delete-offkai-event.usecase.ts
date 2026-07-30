import type { GetOffkaiEventRequest, UserId } from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import { OffkaiEventRepository } from "../../../repository";

export async function deleteOffkaiEvent(
	params: GetOffkaiEventRequest,
	userId: UserId,
) {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(params.id);
	const seriesRole = await repository.findSeriesMemberRole(userId, event.seriesId);

	if (!hasSeriesRole(seriesRole, "owner")) {
		throw new AppError("FORBIDDEN", "このオフ会を削除する権限がありません。");
	}

	await repository.delete(params.id);
}
