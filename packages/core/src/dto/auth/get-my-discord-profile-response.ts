import { z } from "zod";
import { DiscordUsernameSchema } from "../../schema";

export const GetMyDiscordProfileResponseSchema = z.object({
	username: DiscordUsernameSchema,
	avatarUrl: z.string().url().nullable(),
});

export type GetMyDiscordProfileResponse = z.infer<
	typeof GetMyDiscordProfileResponseSchema
>;
