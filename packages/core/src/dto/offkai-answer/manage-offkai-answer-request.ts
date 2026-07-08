import { z } from "zod";
import { OffkaiEventIdSchema, UserIdSchema } from "../../schema";

export const ManageOffkaiAnswerRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	userId: UserIdSchema,
});

export type ManageOffkaiAnswerRequest = z.infer<
	typeof ManageOffkaiAnswerRequestSchema
>;
