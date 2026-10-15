import { z } from "zod";
import {
	BringingKigurumiSchema,
	CommitmentAnswerSchema,
	OffkaiEventIdSchema,
	PreferenceAnswerSchema,
} from "../../schema";

export const SaveOffkaiAnswerRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	respondentName: z
		.string()
		.trim()
		.min(1, "名前を入力してください。")
		.max(50, "名前は50文字以内で入力してください。")
		.optional(),
	commitmentAnswers: z.array(CommitmentAnswerSchema),
	preferenceAnswers: z.array(PreferenceAnswerSchema),
	bringingKigurumis: z.array(BringingKigurumiSchema).default([]),
});

export type SaveOffkaiAnswerRequest = z.infer<
	typeof SaveOffkaiAnswerRequestSchema
>;
