import { z } from "zod";

export const SaveOffkaiAnswerResponseSchema = z.object({
	ok: z.literal(true),
});

export type SaveOffkaiAnswerResponse = z.infer<
	typeof SaveOffkaiAnswerResponseSchema
>;
