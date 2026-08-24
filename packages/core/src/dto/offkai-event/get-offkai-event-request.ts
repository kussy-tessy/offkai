import z from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const GetOffkaiEventRequestSchema = z.object({
	id: OffkaiEventIdSchema,
});
export type GetOffkaiEventRequest = z.infer<typeof GetOffkaiEventRequestSchema>;
