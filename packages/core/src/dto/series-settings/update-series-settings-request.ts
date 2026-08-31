import { z } from "zod";
import { DiscordGuildIdSchema } from "../../schema";

export const UpdateSeriesSettingsRequestSchema = z.object({
	discordGuildId: DiscordGuildIdSchema.nullable(),
});

export type UpdateSeriesSettingsRequest = z.infer<
	typeof UpdateSeriesSettingsRequestSchema
>;
