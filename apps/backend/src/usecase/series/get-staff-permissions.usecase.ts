import type { GetStaffPermissionsResponse, UserId } from "@offkai/core";
import { SeriesRepository } from "../../repository";

export function getStaffPermissions(userId: UserId): Promise<GetStaffPermissionsResponse> {
	return new SeriesRepository().findStaffPermissionsByOwner(userId);
}
