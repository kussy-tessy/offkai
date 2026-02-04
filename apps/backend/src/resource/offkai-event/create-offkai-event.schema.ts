import z from "zod";

export const CreateOffkaiEventInputSchema = z.object({
	title: z.string().min(1).max(100),
	eventDate: z.string().date(),
	applicationStartDate: z.string().date(),
	description: z.string().max(1000),
	commitmentQuestions: z.array(
		z.object({
			question: z.string().min(1).max(100),
			questionShort: z.string().min(1).max(100),
			description: z.string().min(1).max(500),
			deadline: z.string().date(),
			capacity: z.number().min(1).max(100),
		}),
	),
	preferenceQuestions: z.array(
		z.object({
			question: z.string().min(1).max(100),
			answer: z.enum(["free", "choices", "choicesIncludingOther"]),
			choices: z.array(z.string().min(1).max(100)).optional(),
		}),
	),
});
export type CreateOffkaiEventInput = z.infer<
	typeof CreateOffkaiEventInputSchema
>;
