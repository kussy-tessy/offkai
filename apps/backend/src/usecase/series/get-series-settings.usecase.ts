import type { GetSeriesSettingsResponse, UserId } from "@offkai/core";
import { SeriesRepository } from "../../repository";

export async function getSeriesSettings(
	userId: UserId,
): Promise<GetSeriesSettingsResponse> {
	return new SeriesRepository().findSettingsByOwner(userId);
}
