import { z } from "zod";
import {
	BringingKigurumiSchema,
	ISODateTimeStringSchema,
	KigurumiSchema,
	LocalDatePeriodStringSchema,
	OffkaiEventIdSchema,
	QuestionIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const OffkaiEventHeaderSchema = z.object({
	id: OffkaiEventIdSchema,
	title: z.string(),
	eventPeriod: LocalDatePeriodStringSchema,
});
export type OffkaiEventHeader = z.infer<typeof OffkaiEventHeaderSchema>;

export const CommitmentQuestionWithAnswerSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
	description: z.string(),
	required: z.boolean().default(false),
	deadline: ISODateTimeStringSchema,
	capacity: z.number().nonnegative(),
	currentCount: z.number().nonnegative(),
	canSelectYes: z.boolean(),
	canEdit: z.boolean(),
	disableReason: z
		.enum(["deadlinePassed", "capacityFull", "applicationNotStarted"])
		.optional(),
	userAnswer: z.enum(["yes", "no"]).nullable(),
});
export type CommitmentQuestionWithAnswer = z.infer<
	typeof CommitmentQuestionWithAnswerSchema
>;

export const PreferenceQuestionWithAnswerSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
	description: z.string(),
	required: z.boolean().default(false),
	answerTemplate: z.object({
		type: z.enum(["free", "choices", "choicesIncludingOther"]),
		choices: z.array(z.string()).optional(),
	}),
	userAnswer: z.string().nullable(),
});
export type PreferenceQuestionWithAnswer = z.infer<
	typeof PreferenceQuestionWithAnswerSchema
>;

export const GetMyAnswerFormResponseSchema = z.object({
	canBypassParticipationRestrictions: z.boolean().default(false),
	event: OffkaiEventHeaderSchema,
	respondent: z
		.object({
			id: UserIdSchema,
			displayName: UserNameSchema,
		})
		.optional(),
	commitmentQuestions: z.array(CommitmentQuestionWithAnswerSchema),
	preferenceQuestions: z.array(PreferenceQuestionWithAnswerSchema),
	askBringingKigurumi: z.boolean().default(false),
	kigurumiOptions: z.array(KigurumiSchema).default([]),
	bringingKigurumis: z.array(BringingKigurumiSchema).default([]),
});
export type GetMyAnswerFormResponse = z.infer<
	typeof GetMyAnswerFormResponseSchema
>;
