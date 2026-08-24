import type { GetMyOffkaiEventsResponse, UserId } from "@offkai/core";
import { OffkaiEventRepository } from "../../../repository";

export async function getMyOffkaiEvents(
	userId: UserId,
): Promise<GetMyOffkaiEventsResponse> {
	return new OffkaiEventRepository().findMyOffkaiEvents(userId);
}
