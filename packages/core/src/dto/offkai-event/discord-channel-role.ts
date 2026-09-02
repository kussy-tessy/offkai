import { z } from "zod";
import {
	DiscordChannelIdSchema,
	DiscordRoleIdSchema,
	OffkaiEventIdSchema,
} from "../../schema";

const DiscordResourceNameSchema = z.string().trim().min(1).max(100);
const DiscordTextChannelNameSchema = z.string().trim().min(1).max(100);

export const GetDiscordChannelConfigurationRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetDiscordChannelConfigurationRequest = z.infer<
	typeof GetDiscordChannelConfigurationRequestSchema
>;

export const GetDiscordChannelConfigurationResponseSchema = z.object({
	suggestedCategoryName: DiscordResourceNameSchema,
	suggestedRoleName: DiscordResourceNameSchema,
	categories: z.array(
		z.object({
			id: DiscordChannelIdSchema,
			name: z.string(),
			channels: z.array(
				z.object({ id: DiscordChannelIdSchema, name: z.string() }),
			),
		}),
	),
});
export type GetDiscordChannelConfigurationResponse = z.infer<
	typeof GetDiscordChannelConfigurationResponseSchema
>;

const CreateCategorySchema = z.object({
	mode: z.literal("create"),
	name: DiscordResourceNameSchema,
	channelNames: z
		.array(DiscordTextChannelNameSchema)
		.min(1)
		.max(10)
		.refine((names) => new Set(names).size === names.length, {
			message: "チャンネル名が重複しています。",
		}),
});

const ExistingCategorySchema = z.object({
	mode: z.literal("existing"),
	categoryId: DiscordChannelIdSchema,
});

const CreateRoleSchema = z.object({
	mode: z.literal("create"),
	name: DiscordResourceNameSchema,
});

const ExistingRoleSchema = z.object({
	mode: z.literal("existing"),
	roleId: DiscordRoleIdSchema,
});

export const CreateDiscordChannelRoleRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	category: z.discriminatedUnion("mode", [
		CreateCategorySchema,
		ExistingCategorySchema,
	]),
	role: z.discriminatedUnion("mode", [CreateRoleSchema, ExistingRoleSchema]),
});
export type CreateDiscordChannelRoleRequest = z.infer<
	typeof CreateDiscordChannelRoleRequestSchema
>;

export const CreateDiscordChannelRoleResponseSchema = z.object({
	category: z.object({ id: DiscordChannelIdSchema, name: z.string() }),
	channels: z.array(z.object({ id: DiscordChannelIdSchema, name: z.string() })),
	role: z.object({ id: DiscordRoleIdSchema, name: z.string() }),
});
export type CreateDiscordChannelRoleResponse = z.infer<
	typeof CreateDiscordChannelRoleResponseSchema
>;
