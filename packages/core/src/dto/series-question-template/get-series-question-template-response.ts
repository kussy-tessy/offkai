import { z } from "zod";
import { PreferenceQuestionTemplateItemSchema } from "../../schema";

export const GetSeriesQuestionTemplateResponseSchema = z.object({
	preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
});

export type GetSeriesQuestionTemplateResponse = z.infer<
	typeof GetSeriesQuestionTemplateResponseSchema
>;
