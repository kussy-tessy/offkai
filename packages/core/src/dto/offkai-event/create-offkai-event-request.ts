import z from "zod";
import { preprocessDatetime } from "../../util/index.js";

export const CreateOffkaiEventRequestSchema = z.object({
	title: z.string().min(1).max(100),
	eventDate: z.string().date(),
	applicationStartDate: z.preprocess(preprocessDatetime, z.string().datetime()),
	description: z.string().max(1000),
	commitmentQuestions: z.array(
		z.object({
			question: z.string().min(1).max(100),
			questionShort: z.string().min(1).max(100),
			description: z.string().min(1).max(500),
			deadline: z.preprocess(preprocessDatetime, z.string().datetime()),
			capacity: z.number().min(1).max(100),
		}),
	),
	preferenceQuestions: z.array(
		z.object({
			question: z.string().min(1).max(100),
			answer: z.object({
				type: z.enum(["free", "choices", "choicesIncludingOther"]),
				choices: z.array(z.string().min(1).max(100)).optional(),
			})
		}),
	),
});
export type CreateOffkaiEventRequest = z.infer<
	typeof CreateOffkaiEventRequestSchema
>;
