import { z } from "zod";
import {
	BringingKigurumiSchema,
	CapacitySchema,
	ISODateTimeStringSchema,
	LocalDatePeriodStringSchema,
	OffkaiEventIdSchema,
	PreferenceQuestionAnswerFormSchema,
	QuestionIdSchema,
	SeriesRoleSchema,
	UserIdSchema,
	UserNameSchema,
} from ".";

export const CommitmentQuestionHeaderSchema = z.object({
	id: QuestionIdSchema,
	questionShort: z.string(),
	capacity: CapacitySchema.nullable(),
	yesCount: z.number().int().nonnegative(),
	deadline: ISODateTimeStringSchema.nullable(),
	required: z.boolean().default(false),
});
export type CommitmentQuestionHeader = z.infer<
	typeof CommitmentQuestionHeaderSchema
>;

export const PreferenceQuestionHeaderSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
	answerTemplate: PreferenceQuestionAnswerFormSchema,
	required: z.boolean().default(false),
});
export type PreferenceQuestionHeader = z.infer<
	typeof PreferenceQuestionHeaderSchema
>;

export const AnswerRowSchema = z.object({
	user: z.object({
		id: UserIdSchema,
		displayName: UserNameSchema,
	}),
	createdAt: ISODateTimeStringSchema,
	commitmentAnswers: z.record(
		QuestionIdSchema,
		z.enum(["yes", "no"]).nullable(),
	),
	preferenceAnswers: z
		.record(QuestionIdSchema, z.string().nullable())
		.nullable(),
	bringingKigurumis: z.array(BringingKigurumiSchema).nullable(),
});
export type AnswerRow = z.infer<typeof AnswerRowSchema>;

export const OffkaiDetailSchema = z.object({
	offkai: z.object({
		id: OffkaiEventIdSchema,
		title: z.string(),
		description: z.string(),
		eventPeriod: LocalDatePeriodStringSchema,
		applicationStartDate: ISODateTimeStringSchema,
		askBringingKigurumi: z.boolean().default(false),
	}),
	viewer: z.object({
		seriesRole: SeriesRoleSchema.nullable(),
		isParticipant: z.boolean(),
		permissions: z.object({
			canViewOverview: z.boolean(),
			canViewParticipants: z.boolean(),
			canViewPrivateAnswers: z.boolean(),
			canEditEvent: z.boolean(),
			canDeleteEvent: z.boolean(),
			canEditAnswers: z.boolean(),
			canManageDiscordRole: z.boolean(),
			canManagePayments: z.boolean(),
		}),
	}),
	participantsAccess: z.object({
		granted: z.boolean(),
		reason: z
			.enum([
				"AUTHENTICATION_REQUIRED",
				"DISCORD_NOT_CONNECTED",
				"NOT_GUILD_MEMBER",
				"NOT_PARTICIPANT",
				"MEMBERSHIP_CHECK_UNAVAILABLE",
			])
			.optional(),
	}),

	commitmentQuestions: z.array(CommitmentQuestionHeaderSchema),
	preferenceQuestions: z.array(PreferenceQuestionHeaderSchema).nullable(),

	answers: z.array(AnswerRowSchema).nullable(),
});
export type OffkaiDetail = z.infer<typeof OffkaiDetailSchema>;
