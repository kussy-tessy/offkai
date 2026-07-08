import { z } from "zod";
import { DiscordUsernameSchema } from "../../schema";

export const ConnectDiscordRequestSchema = z.object({
	discordUsername: DiscordUsernameSchema,
});

export type ConnectDiscordRequest = z.infer<typeof ConnectDiscordRequestSchema>;
