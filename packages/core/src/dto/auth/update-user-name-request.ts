import { z } from "zod";
import { UserNameSchema } from "../../schema";

export const UpdateUserNameRequestSchema = z.object({
	name: UserNameSchema,
});

export type UpdateUserNameRequest = z.infer<typeof UpdateUserNameRequestSchema>;
