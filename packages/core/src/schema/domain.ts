import { z } from "zod";

export const UserIdSchema = z.string().uuid().brand("UserId");
export type UserId = z.infer<typeof UserIdSchema>;

export const UserNameSchema = z.string().brand("UserName");
export type UserName = z.infer<typeof UserNameSchema>;

export const OffkaiSeriesIdSchema = z.string().uuid().brand("OffkaiSeriesId");
export type OffkaiSeriesId = z.infer<typeof OffkaiSeriesIdSchema>;

export const OffkaiEventIdSchema = z.string().uuid().brand("OffkaiEventId");
export type OffkaiEventId = z.infer<typeof OffkaiEventIdSchema>;

export const EventDateSchema = z.date().brand("OffkaiEventDate");
export type EventDate = z.infer<typeof EventDateSchema>;

export const ApplicationStartDateSchema = z
	.date()
	.brand("ApplicationStartDate");
export type ApplicationStartDate = z.infer<typeof ApplicationStartDateSchema>;

export const QuestionIdSchema = z.string().uuid().brand("QuestionId");
export type QuestionId = z.infer<typeof QuestionIdSchema>;

export const AnswerIdSchema = z.string().uuid().brand("AnswerId");
export type AnswerId = z.infer<typeof AnswerIdSchema>;

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
});
export type CommitmentQuestion = z.infer<typeof CommitmentQuestionSchema>;

export const CommitmentAnswerSchema = z.object({
	questionId: QuestionIdSchema,
	answer: z.enum(["yes", "no"]),
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

export const PreferenceQuestionSchema = z.object({
	id: QuestionIdSchema,
	question: z.string(),
	answer: PreferenceQuestionAnswerFormSchema,
});
export type PreferenceQuestion = z.infer<typeof PreferenceQuestionSchema>;

export const PreferenceAnswerSchema = z.object({
	questionId: QuestionIdSchema,
	answer: z.string(),
});
export type PreferenceAnswer = z.infer<typeof PreferenceAnswerSchema>;
