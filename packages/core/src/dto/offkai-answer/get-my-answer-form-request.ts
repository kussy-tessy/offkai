import z from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const GetMyAnswerFormRequestSchema = z.object({
  eventId: OffkaiEventIdSchema,
});
export type GetMyAnswerFormRequest = z.infer<
  typeof GetMyAnswerFormRequestSchema
>;
