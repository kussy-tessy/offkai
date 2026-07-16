import { z } from "zod";
import {
  DiscordUserIdSchema,
  DiscordUsernameSchema,
  ISODateTimeStringSchema,
  UserIdSchema,
  UserLoginIdSchema,
  UserNameSchema,
} from "../../schema";

export const GetMeResponseSchema = z.object({
  id: UserIdSchema,
  loginId: UserLoginIdSchema,
  name: UserNameSchema,
  discordUsername: DiscordUsernameSchema.nullable(),
  discordUserId: DiscordUserIdSchema.nullable(),
  createdAt: ISODateTimeStringSchema,
  isSeriesOwner: z.boolean(),
});

export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;