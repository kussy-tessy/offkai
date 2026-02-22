import z from "zod";

export const GetOffkaiDetailRequestSchema = z.object({
  id: z.string().uuid(),
});
export type GetOffkaiDetailRequest = z.infer<
  typeof GetOffkaiDetailRequestSchema
>;
