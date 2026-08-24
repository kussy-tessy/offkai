import { z } from "zod";
import {
	LocalDatePeriodStringSchema,
	OffkaiEventIdSchema,
	SeriesRoleSchema,
} from "../../schema";

export const OffkaiEventSummarySchema = z.object({
	id: OffkaiEventIdSchema,
	title: z.string(),
	eventPeriod: LocalDatePeriodStringSchema,
	description: z.string(),
	seriesRole: SeriesRoleSchema.nullable(),
});
export type OffkaiEventSummary = z.infer<typeof OffkaiEventSummarySchema>;

export const GetMyOffkaiEventsResponseSchema = z.array(
	OffkaiEventSummarySchema,
);
export type GetMyOffkaiEventsResponse = z.infer<
	typeof GetMyOffkaiEventsResponseSchema
>;
