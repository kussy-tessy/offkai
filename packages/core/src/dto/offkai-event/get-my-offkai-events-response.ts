import { z } from "zod";
import { ISODateTimeStringSchema, OffkaiEventIdSchema } from "../../schema";

export const OffkaiEventSummarySchema = z.object({
  id: OffkaiEventIdSchema,
  title: z.string(),
  eventDate: ISODateTimeStringSchema,
  description: z.string(),
  canEdit: z.boolean(),
});
export type OffkaiEventSummary = z.infer<typeof OffkaiEventSummarySchema>;

export const GetMyOffkaiEventsResponseSchema = z.array(
  OffkaiEventSummarySchema,
);
export type GetMyOffkaiEventsResponse = z.infer<
  typeof GetMyOffkaiEventsResponseSchema
>;
