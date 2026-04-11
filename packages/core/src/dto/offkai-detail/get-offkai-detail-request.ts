import z from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const GetOffkaiDetailRequestSchema = z.object({
  id: OffkaiEventIdSchema,
});
export type GetOffkaiDetailRequest = z.infer<
  typeof GetOffkaiDetailRequestSchema
>;
