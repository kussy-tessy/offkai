import z from "zod";
import { OffkaiEventIdSchema, UserIdSchema } from "../../schema";

export const UpdateOffkaiEventDiscordRoleMemberRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	userId: UserIdSchema,
	hasRole: z.boolean(),
});
export type UpdateOffkaiEventDiscordRoleMemberRequest = z.infer<
	typeof UpdateOffkaiEventDiscordRoleMemberRequestSchema
>;

export const UpdateOffkaiEventDiscordRoleMemberResponseSchema = z.object({
	userId: UserIdSchema,
	hasRole: z.boolean(),
});
export type UpdateOffkaiEventDiscordRoleMemberResponse = z.infer<
	typeof UpdateOffkaiEventDiscordRoleMemberResponseSchema
>;
