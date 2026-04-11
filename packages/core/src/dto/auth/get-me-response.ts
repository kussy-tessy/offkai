import { z } from "zod";
import { ISODateTimeStringSchema, UserIdSchema, UserNameSchema } from "../../schema";

export const GetMeResponseSchema = z.object({
  id: UserIdSchema,
  loginId: z.string(),
  name: UserNameSchema,
  createdAt: ISODateTimeStringSchema,
});

export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;