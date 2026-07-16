import z from "zod";
import { DiscordRoleIdSchema } from "../../schema";

export const ListDiscordRolesResponseSchema = z.object({
	roles: z.array(
		z.object({
			id: DiscordRoleIdSchema,
			name: z.string(),
		}),
	),
});
export type ListDiscordRolesResponse = z.infer<
	typeof ListDiscordRolesResponseSchema
>;
