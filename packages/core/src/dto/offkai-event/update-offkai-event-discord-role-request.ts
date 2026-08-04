import z from "zod";
import { DiscordRoleIdSchema, OffkaiEventIdSchema } from "../../schema";

export const GetOffkaiEventDiscordRoleResponseSchema = z.object({
	discordRoleId: DiscordRoleIdSchema.nullable(),
	roles: z.array(z.object({ id: DiscordRoleIdSchema, name: z.string() })),
});
export type GetOffkaiEventDiscordRoleResponse = z.infer<
	typeof GetOffkaiEventDiscordRoleResponseSchema
>;

export const UpdateOffkaiEventDiscordRoleRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	discordRoleId: DiscordRoleIdSchema.nullable(),
});
export type UpdateOffkaiEventDiscordRoleRequest = z.infer<
	typeof UpdateOffkaiEventDiscordRoleRequestSchema
>;

export const UpdateOffkaiEventDiscordRoleResponseSchema = z.object({
	discordRoleId: DiscordRoleIdSchema.nullable(),
});
export type UpdateOffkaiEventDiscordRoleResponse = z.infer<
	typeof UpdateOffkaiEventDiscordRoleResponseSchema
>;
