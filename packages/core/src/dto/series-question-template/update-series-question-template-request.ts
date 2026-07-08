import { z } from "zod";
import { PreferenceQuestionTemplateItemSchema } from "../../schema";

export const UpdateSeriesQuestionTemplateRequestSchema = z.object({
	preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
});

export type UpdateSeriesQuestionTemplateRequest = z.infer<
	typeof UpdateSeriesQuestionTemplateRequestSchema
>;
