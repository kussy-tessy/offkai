import { z } from "zod";
import { PreferenceQuestionTemplateItemSchema } from "../../schema";

export const UpdateSeriesQuestionTemplateResponseSchema = z.object({
	preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
});

export type UpdateSeriesQuestionTemplateResponse = z.infer<
	typeof UpdateSeriesQuestionTemplateResponseSchema
>;
