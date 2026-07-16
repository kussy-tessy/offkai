import z from "zod";
import {
	LocalDatePeriodStringSchema,
	LocalDateTimeMinuteStringSchema,
	OffkaiEventIdSchema,
	OffkaiSeriesIdSchema,
	QuestionIdSchema,
	DiscordRoleIdSchema,
} from "../../schema";

export const OffkaiEventResponseSchema = z.object({
	id: OffkaiEventIdSchema,
	seriesId: OffkaiSeriesIdSchema,
	title: z.string(),
	eventPeriod: LocalDatePeriodStringSchema,
	applicationStartDate: LocalDateTimeMinuteStringSchema,
	description: z.string(),
	discordRoleId: DiscordRoleIdSchema.nullable(),
	askBringingKigurumi: z.boolean().default(false),
	commitmentQuestions: z.array(
		z.object({
			id: QuestionIdSchema,
			question: z.string(),
			questionShort: z.string(),
			description: z.string(),
			deadline: LocalDateTimeMinuteStringSchema,
			capacity: z.number(),
			required: z.boolean().default(false),
		}),
	),
	preferenceQuestions: z.array(
		z.object({
			id: QuestionIdSchema,
			question: z.string(),
			required: z.boolean().default(false),
			answerTemplate: z.object({
				type: z.enum(["free", "choices", "choicesIncludingOther"]),
				choices: z.array(z.string()).optional(),
			}),
		}),
	),
});
export type OffkaiEventResponse = z.infer<typeof OffkaiEventResponseSchema>;
