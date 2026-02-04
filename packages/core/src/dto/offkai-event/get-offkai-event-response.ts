import z from "zod";

export const OffkaiEventResponseSchema = z.object({
	id: z.string().uuid(),
	seriesId: z.string().uuid(),
	title: z.string(),
	eventDate: z.string().date(),
	applicationStartDate: z.string().date(),
	description: z.string(),
	commitmentQuestions: z.array(
		z.object({
			id: z.string().uuid(),
			question: z.string(),
			questionShort: z.string(),
			description: z.string(),
			deadline: z.string().date(),
			capacity: z.number(),
		}),
	),
	preferenceQuestions: z.array(
		z.object({
			id: z.string().uuid(),
			question: z.string(),
			answer: z.object({
				type: z.enum(["free", "choices", "choicesIncludingOther"]),
				choices: z.array(z.string()).optional(),
			}),
		}),
	),
});
export type OffkaiEventResponse = z.infer<typeof OffkaiEventResponseSchema>;
