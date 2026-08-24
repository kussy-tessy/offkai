import z from "zod";
import {
	LocalDatePeriodStringSchema,
	LocalDateTimeMinuteStringSchema,
	DiscordRoleIdSchema,
	EventVisibilitySchema,
	QuestionIdSchema,
	isVisibilityAtLeastAsRestricted,
} from "../../schema";
import { preprocessDatetime } from "../../util";

const LocalDateTimeToISOStringSchema =
	LocalDateTimeMinuteStringSchema.transform((value) =>
		preprocessDatetime(value),
	).pipe(z.string().datetime({ offset: true }));

export const CreateOffkaiEventRequestSchema = z
	.object({
		title: z.string().min(1).max(100),
		eventPeriod: LocalDatePeriodStringSchema,
		applicationStartDate: LocalDateTimeToISOStringSchema,
		description: z.string().max(1000),
		participantDescription: z.string().max(1000).default(""),
		discordRoleId: DiscordRoleIdSchema.nullable().default(null),
		askBringingKigurumi: z.boolean().default(false),
		overviewVisibility: EventVisibilitySchema.default("AUTHENTICATED"),
		participantsVisibility: EventVisibilitySchema.default("AUTHENTICATED"),
		commitmentQuestions: z.array(
			z.object({
				id: QuestionIdSchema.optional(),
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
				id: QuestionIdSchema.optional(),
				question: z.string().min(1).max(100),
				description: z.string().max(500),
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
	})
	.superRefine((value, ctx) => {
		if (value.overviewVisibility === "PARTICIPANTS") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["overviewVisibility"],
				message: "オフ会概要の公開範囲にオフ会参加表明者は指定できません",
			});
		}
		if (
			!isVisibilityAtLeastAsRestricted(
				value.participantsVisibility,
				value.overviewVisibility,
			)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["participantsVisibility"],
				message:
					"参加者一覧・回答の公開範囲は、オフ会概要と同じか、より限定してください",
			});
		}
	});
export type CreateOffkaiEventRequest = z.infer<
	typeof CreateOffkaiEventRequestSchema
>;
