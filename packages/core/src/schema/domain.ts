import { z } from "zod";

export const UserIdSchema = z.string().uuid().brand("UserId");
export type UserId = z.infer<typeof UserIdSchema>;

export const UserLoginIdSchema = z
	.string()
	.regex(/^[A-Za-z0-9_]+$/)
	.brand("UserLoginId");
export type UserLoginId = z.infer<typeof UserLoginIdSchema>;

export const UserNameSchema = z.string().min(1).max(50).brand("UserName");
export type UserName = z.infer<typeof UserNameSchema>;

export const DiscordUsernameSchema = z
	.string()
	.min(2)
	.max(32)
	.regex(/^(?!.*\.\.)[a-z0-9._]+$/)
	.brand("DiscordUsername");
export type DiscordUsername = z.infer<typeof DiscordUsernameSchema>;

export const DiscordUserIdSchema = z
	.string()
	.regex(/^\d{17,20}$/)
	.brand("DiscordUserId");
export type DiscordUserId = z.infer<typeof DiscordUserIdSchema>;

export const DiscordGuildIdSchema = z
	.string()
	.regex(/^\d{17,20}$/)
	.brand("DiscordGuildId");
export type DiscordGuildId = z.infer<typeof DiscordGuildIdSchema>;

export const DiscordRoleIdSchema = z
	.string()
	.regex(/^\d{17,20}$/)
	.brand("DiscordRoleId");
export type DiscordRoleId = z.infer<typeof DiscordRoleIdSchema>;

export const OffkaiSeriesIdSchema = z.string().uuid().brand("OffkaiSeriesId");
export type OffkaiSeriesId = z.infer<typeof OffkaiSeriesIdSchema>;

export const OffkaiEventIdSchema = z.string().uuid().brand("OffkaiEventId");
export type OffkaiEventId = z.infer<typeof OffkaiEventIdSchema>;

export const EventDateSchema = z.date().brand("OffkaiEventDate");
export type EventDate = z.infer<typeof EventDateSchema>;

export const EventPeriodSchema = z
	.object({
		startDate: EventDateSchema,
		endDate: EventDateSchema,
	})
	.superRefine((value, ctx) => {
		if (value.endDate < value.startDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["endDate"],
				message: "終了日は開始日以降にしてください",
			});
		}
	})
	.brand("EventPeriod");
export type EventPeriod = z.infer<typeof EventPeriodSchema>;

export const ApplicationStartDateSchema = z
	.date()
	.brand("ApplicationStartDate");
export type ApplicationStartDate = z.infer<typeof ApplicationStartDateSchema>;

export const QuestionIdSchema = z.string().uuid().brand("QuestionId");
export type QuestionId = z.infer<typeof QuestionIdSchema>;

export const AnswerIdSchema = z.string().uuid().brand("AnswerId");
export type AnswerId = z.infer<typeof AnswerIdSchema>;

export const PhotoShareIdSchema = z.string().uuid().brand("PhotoShareId");
export type PhotoShareId = z.infer<typeof PhotoShareIdSchema>;

export const KigurumiIdSchema = z.string().uuid().brand("KigurumiId");
export type KigurumiId = z.infer<typeof KigurumiIdSchema>;

export const DeadlineSchema = z.date().brand("Deadline");
export type Deadline = z.infer<typeof DeadlineSchema>;

export const CapacitySchema = z.number().nonnegative().brand("Capacity");
export type Capacity = z.infer<typeof CapacitySchema>;

export const CommitmentQuestionSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
	questionShort: z.string(),
	deadline: DeadlineSchema,
	description: z.string(),
	capacity: CapacitySchema,
	required: z.boolean().default(false),
});
export type CommitmentQuestion = z.infer<typeof CommitmentQuestionSchema>;

export const CommitmentAnswerSchema = z.object({
	questionId: QuestionIdSchema,
	answer: z.enum(["yes", "no"]).nullable(),
});
export type CommitmentAnswer = z.infer<typeof CommitmentAnswerSchema>;

export const PreferenceQuestionAnswerTypeSchema = z.enum([
	"free",
	"choices",
	"choicesIncludingOther",
]);
export type PreferenceQuestionAnswerType = z.infer<
	typeof PreferenceQuestionAnswerTypeSchema
>;

export const PreferenceQuestionAnswerFormSchema = z.union([
	z.object({
		type: z.literal("free"),
	}),
	z.object({
		type: z.literal("choices"),
		choices: z.array(z.string()),
	}),
	z.object({
		type: z.literal("choicesIncludingOther"),
		choices: z.array(z.string()),
	}),
]);
export type PreferenceQuestionAnswerForm = z.infer<
	typeof PreferenceQuestionAnswerFormSchema
>;

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
export type PreferenceQuestionTemplateItem = z.infer<
	typeof PreferenceQuestionTemplateItemSchema
>;

export const PreferenceQuestionSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
	questionShort: z.string(),
	answerTemplate: PreferenceQuestionAnswerFormSchema,
	required: z.boolean().default(false),
});
export type PreferenceQuestion = z.infer<typeof PreferenceQuestionSchema>;

export const PreferenceAnswerSchema = z.object({
	questionId: QuestionIdSchema,
	answer: z.string().nullable(),
});
export type PreferenceAnswer = z.infer<typeof PreferenceAnswerSchema>;

export const KigurumiSchema = z.object({
	id: KigurumiIdSchema,
	ownerUserId: UserIdSchema,
	title: z.string().min(1).max(100),
	character: z.string().min(1).max(100),
});
export type Kigurumi = z.infer<typeof KigurumiSchema>;

export const BringingKigurumiSchema = KigurumiSchema.pick({
	title: true,
	character: true,
});
export type BringingKigurumi = z.infer<typeof BringingKigurumiSchema>;
