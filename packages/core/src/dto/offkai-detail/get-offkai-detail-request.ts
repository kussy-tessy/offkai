import z from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const GetOffkaiDetailRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetOffkaiDetailRequest = z.infer<
	typeof GetOffkaiDetailRequestSchema
>;
