import { z } from "zod";
import { UserLoginIdSchema } from "../../schema";

export const SetPasswordCredentialRequestSchema = z.object({
	loginId: UserLoginIdSchema,
	password: z.string().min(1),
});

export type SetPasswordCredentialRequest = z.infer<
	typeof SetPasswordCredentialRequestSchema
>;
