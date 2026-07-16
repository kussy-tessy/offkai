import z from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const GetOffkaiEventDiscordRoleMembersRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetOffkaiEventDiscordRoleMembersRequest = z.infer<
	typeof GetOffkaiEventDiscordRoleMembersRequestSchema
>;
