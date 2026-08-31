import type {
	GetSeriesSettingsResponse,
	UpdateSeriesSettingsRequest,
	UserId,
} from "@offkai/core";
import { SeriesRepository } from "../../repository";

export async function updateSeriesSettings(
	input: UpdateSeriesSettingsRequest,
	userId: UserId,
): Promise<GetSeriesSettingsResponse> {
	const repository = new SeriesRepository();
	await repository.updateDiscordGuildIdByOwner(userId, input.discordGuildId);
	return { discordGuildId: input.discordGuildId };
}
