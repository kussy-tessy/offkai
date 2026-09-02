import { z } from "zod";
import {
	DiscordUsernameSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const SeriesStaffSchema = z.object({
	userId: UserIdSchema,
	userName: UserNameSchema,
	discordUsername: DiscordUsernameSchema.nullable(),
	discordAvatarUrl: z.string().url().nullable(),
});
export type SeriesStaff = z.infer<typeof SeriesStaffSchema>;

export const GetSeriesStaffResponseSchema = SeriesStaffSchema.array();
export type GetSeriesStaffResponse = z.infer<
	typeof GetSeriesStaffResponseSchema
>;

export const AddSeriesStaffRequestSchema = z.object({
	discordUsername: DiscordUsernameSchema,
});
export type AddSeriesStaffRequest = z.infer<typeof AddSeriesStaffRequestSchema>;

export const AddSeriesStaffResponseSchema = SeriesStaffSchema;
export type AddSeriesStaffResponse = z.infer<
	typeof AddSeriesStaffResponseSchema
>;
