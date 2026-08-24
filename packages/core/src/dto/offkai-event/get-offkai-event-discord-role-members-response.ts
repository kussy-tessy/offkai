import z from "zod";
import {
	DiscordRoleIdSchema,
	DiscordUserIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const DiscordRoleMemberUnavailableReasonSchema = z.enum([
	"DISCORD_NOT_CONNECTED",
	"DISCORD_MEMBER_NOT_FOUND",
]);
export type DiscordRoleMemberUnavailableReason = z.infer<
	typeof DiscordRoleMemberUnavailableReasonSchema
>;

export const GetOffkaiEventDiscordRoleMembersResponseSchema = z.object({
	role: z.object({
		id: DiscordRoleIdSchema,
		name: z.string(),
	}),
	members: z.array(
		z.object({
			userId: UserIdSchema,
			displayName: UserNameSchema,
			discordUsername: z.string().nullable(),
			discordUserId: DiscordUserIdSchema.nullable(),
			discordAvatarUrl: z.string().url().nullable(),
			hasRole: z.boolean(),
			canManageRole: z.boolean(),
			unavailableReason: DiscordRoleMemberUnavailableReasonSchema.optional(),
		}),
	),
});
export type GetOffkaiEventDiscordRoleMembersResponse = z.infer<
	typeof GetOffkaiEventDiscordRoleMembersResponseSchema
>;
