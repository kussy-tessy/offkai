import type { UpdateStaffPermissionsRequest, UserId } from "@offkai/core";
import { SeriesRepository } from "../../repository";

export function updateStaffPermissions(input: UpdateStaffPermissionsRequest, userId: UserId) {
	return new SeriesRepository().updateStaffPermissionsByOwner(userId, input);
}
