import z from "zod";

export const GetOffkaiEventRequestSchema = z.object({
  id: z.string().uuid(),
});
export type GetOffkaiEventRequest = z.infer<typeof GetOffkaiEventRequestSchema>;