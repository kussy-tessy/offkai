import z from "zod";
import {
	LocalDatePeriodStringSchema,
	LocalDateTimeMinuteStringSchema,
	DiscordRoleIdSchema,
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
	discordRoleId: DiscordRoleIdSchema.nullable().default(null),
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
			answerTemplate: z.discriminatedUnion("type", [
				z.object({
					type: z.literal("free"),
				}),
				z.object({
					type: z.literal("choices"),
					choices: z.array(z.string().min(1).max(100)).min(1),
				}),
				z.object({
					type: z.literal("choicesIncludingOther"),
					choices: z.array(z.string().min(1).max(100)).min(1),
				}),
			]),
		}),
	),
});
export type CreateOffkaiEventRequest = z.infer<
	typeof CreateOffkaiEventRequestSchema
>;
