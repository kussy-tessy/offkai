import type {
	AddSeriesStaffRequest,
	AddSeriesStaffResponse,
	GetSeriesStaffResponse,
	UserId,
} from "@offkai/core";
import { AppError } from "../../app-error";
import { discordService } from "../../discord";
import { SeriesRepository, UserRepository } from "../../repository";

export function getSeriesStaff(
	userId: UserId,
): Promise<GetSeriesStaffResponse> {
	return new SeriesRepository().findStaffByOwner(userId);
}

export async function addSeriesStaff(
	input: AddSeriesStaffRequest,
	ownerUserId: UserId,
): Promise<AddSeriesStaffResponse> {
	const repository = new SeriesRepository();
	const guildId = await repository.findDiscordGuildIdByOwner(ownerUserId);
	if (!guildId) {
		throw new AppError(
			"VALIDATION_ERROR",
			"先にDiscordサーバーIDを設定してください。",
		);
	}

	const discordUserId = await discordService.getUserIdByUsername({
		guildId,
		username: input.discordUsername,
	});
	if (!discordUserId) {
		throw new AppError("VALIDATION_ERROR", "ユーザーが見つかりません。");
	}
	const user = await new UserRepository().findByDiscordUserId(discordUserId);
	if (!user) {
		throw new AppError("VALIDATION_ERROR", "ユーザーが見つかりません。");
	}

	return repository.addStaffByOwner(ownerUserId, user.id);
}

export function removeSeriesStaff(
	ownerUserId: UserId,
	staffUserId: UserId,
): Promise<void> {
	return new SeriesRepository().removeStaffByOwner(ownerUserId, staffUserId);
}
