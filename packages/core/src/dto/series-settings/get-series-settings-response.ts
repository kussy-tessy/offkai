import { z } from "zod";
import { DiscordGuildIdSchema } from "../../schema";

export const GetSeriesSettingsResponseSchema = z.object({
	discordGuildId: DiscordGuildIdSchema.nullable(),
});

export type GetSeriesSettingsResponse = z.infer<
	typeof GetSeriesSettingsResponseSchema
>;
