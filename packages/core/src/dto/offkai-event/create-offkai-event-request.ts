import z from "zod";
import {
	LocalDatePeriodStringSchema,
	LocalDateTimeMinuteStringSchema,
} from "../../schema";
import { preprocessDatetime } from "../../util";

const LocalDateTimeToISOStringSchema = LocalDateTimeMinuteStringSchema
	.transform((value) => preprocessDatetime(value))
	.pipe(z.string().datetime({ offset: true }));

export const CreateOffkaiEventRequestSchema = z.object({
	title: z.string().min(1).max(100),
	eventPeriod: LocalDatePeriodStringSchema,
	applicationStartDate: LocalDateTimeToISOStringSchema,
	description: z.string().max(1000),
	askBringingKigurumi: z.boolean().default(false),
	commitmentQuestions: z.array(
		z.object({
			question: z.string().min(1).max(100),
			questionShort: z.string().min(1).max(100),
			description: z.string().max(500),
			deadline: LocalDateTimeToISOStringSchema,
			capacity: z.number().min(1).max(100),
			required: z.boolean().default(false),
		}),
	),
	preferenceQuestions: z.array(
		z.object({
			question: z.string().min(1).max(100),
			required: z.boolean().default(false),
			answerTemplate: z.object({
				type: z.enum(["free", "choices", "choicesIncludingOther"]),
				choices: z.array(z.string().min(1).max(100)).optional(),
			})
		}),
	),
});
export type CreateOffkaiEventRequest = z.infer<
	typeof CreateOffkaiEventRequestSchema
>;
