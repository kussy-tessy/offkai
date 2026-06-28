import { z } from "zod";

export const PreferenceQuestionTemplateItemSchema = z.object({
	question: z.string().min(1).max(100),
	required: z.boolean().default(false),
	answerTemplate: z.discriminatedUnion("type", [
		z.object({
			type: z.literal("free"),
		}),
		z.object({
			type: z.literal("choices"),
			choices: z.array(z.string().min(1).max(100)),
		}),
		z.object({
			type: z.literal("choicesIncludingOther"),
			choices: z.array(z.string().min(1).max(100)),
		}),
	]),
});

export const SeriesQuestionTemplateSchema = z.object({
	preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
});

export type PreferenceQuestionTemplateItem = z.infer<
	typeof PreferenceQuestionTemplateItemSchema
>;
export type SeriesQuestionTemplate = z.infer<
	typeof SeriesQuestionTemplateSchema
>;
