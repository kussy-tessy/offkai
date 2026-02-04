import { z } from "zod";
import {
	CapacitySchema,
	OffkaiEventIdSchema,
	QuestionIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "./domain.js";
import { ISODateTimeStringSchema } from "./general.js";

export const CommitmentQuestionHeaderSchema = z.object({
	id: QuestionIdSchema,
	label: z.string(),
	capacity: CapacitySchema.nullable(),
	deadline: ISODateTimeStringSchema.nullable(),
});
export type CommitmentQuestionHeader = z.infer<
	typeof CommitmentQuestionHeaderSchema
>;

export const PreferenceQuestionHeaderSchema = z.object({
	id: QuestionIdSchema,
	label: z.string(),
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
});
export type AnswerRow = z.infer<typeof AnswerRowSchema>;

export const OffkaiAnswerListSchema = z.object({
	offkai: z.object({
		id: OffkaiEventIdSchema,
		title: z.string(),
		description: z.string(),
		eventDate: ISODateTimeStringSchema,
	}),

	commitmentQuestions: z.array(CommitmentQuestionHeaderSchema),
	preferenceQuestions: z.array(PreferenceQuestionHeaderSchema),

	answers: z.array(AnswerRowSchema),
});
export type OffkaiAnswerList = z.infer<typeof OffkaiAnswerListSchema>;
