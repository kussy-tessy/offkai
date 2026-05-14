import { z } from "zod";
import {
  ISODateTimeStringSchema,
  UserIdSchema,
  UserLoginIdSchema,
  UserNameSchema,
} from "../../schema";

export const GetMeResponseSchema = z.object({
  id: UserIdSchema,
  loginId: UserLoginIdSchema,
  name: UserNameSchema,
  createdAt: ISODateTimeStringSchema,
  isSeriesOwner: z.boolean(),
});

export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;