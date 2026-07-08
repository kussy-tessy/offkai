import { z } from "zod";
import {
	BringingKigurumiSchema,
	CapacitySchema,
	ISODateTimeStringSchema,
	LocalDatePeriodStringSchema,
	OffkaiEventIdSchema,
	QuestionIdSchema,
	UserIdSchema,
	UserNameSchema,
} from ".";

export const CommitmentQuestionHeaderSchema = z.object({
	id: QuestionIdSchema,
	questionShort: z.string(),
	capacity: CapacitySchema.nullable(),
	deadline: ISODateTimeStringSchema.nullable(),
	required: z.boolean().default(false),
});
export type CommitmentQuestionHeader = z.infer<
	typeof CommitmentQuestionHeaderSchema
>;

export const PreferenceQuestionHeaderSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
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
	commitmentAnswers: z.record(
		QuestionIdSchema,
		z.enum(["yes", "no"]).nullable(),
	),
	preferenceAnswers: z.record(QuestionIdSchema, z.string().nullable()),
	bringingKigurumis: z.array(BringingKigurumiSchema).default([]),
});
export type AnswerRow = z.infer<typeof AnswerRowSchema>;

export const OffkaiDetailSchema = z.object({
	offkai: z.object({
		id: OffkaiEventIdSchema,
		title: z.string(),
		description: z.string(),
		eventPeriod: LocalDatePeriodStringSchema,
		applicationStartDate: ISODateTimeStringSchema,
		canEdit: z.boolean(),
		askBringingKigurumi: z.boolean().default(false),
	}),

	commitmentQuestions: z.array(CommitmentQuestionHeaderSchema),
	preferenceQuestions: z.array(PreferenceQuestionHeaderSchema),

	answers: z.array(AnswerRowSchema),
});
export type OffkaiDetail = z.infer<typeof OffkaiDetailSchema>;
