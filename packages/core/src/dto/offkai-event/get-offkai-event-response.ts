import z from "zod";
import { OffkaiEventIdSchema, OffkaiSeriesIdSchema, QuestionIdSchema } from "../../schema";

export const OffkaiEventResponseSchema = z.object({
	id: OffkaiEventIdSchema,
	seriesId: OffkaiSeriesIdSchema,
	title: z.string(),
	eventDate: z.string().date(),
	applicationStartDate: z.string().date(),
	description: z.string(),
	commitmentQuestions: z.array(
		z.object({
			id: QuestionIdSchema,
			question: z.string(),
			questionShort: z.string(),
			description: z.string(),
			deadline: z.string().date(),
			capacity: z.number(),
		}),
	),
	preferenceQuestions: z.array(
		z.object({
			id: QuestionIdSchema,
			question: z.string(),
			answerTemplate: z.object({
				type: z.enum(["free", "choices", "choicesIncludingOther"]),
				choices: z.array(z.string()).optional(),
			}),
		}),
	),
});
export type OffkaiEventResponse = z.infer<typeof OffkaiEventResponseSchema>;
