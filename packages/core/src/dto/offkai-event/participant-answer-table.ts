import { z } from "zod";
import {
	AnswerIdSchema,
	BringingKigurumiSchema,
	OffkaiEventIdSchema,
	QuestionIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

const QuestionSchema = z.object({ id: QuestionIdSchema, question: z.string() });
export const GetParticipantAnswerTableRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetParticipantAnswerTableRequest = z.infer<
	typeof GetParticipantAnswerTableRequestSchema
>;
export const GetParticipantAnswerTableResponseSchema = z.object({
	canEditAnswers: z.boolean(),
	canDeleteAnswers: z.boolean(),
	canManageGuests: z.boolean(),
	commitmentQuestions: z.array(QuestionSchema),
	preferenceQuestions: z.array(QuestionSchema),
	askBringingKigurumi: z.boolean(),
	participants: z.array(
		z.object({
			answerId: AnswerIdSchema,
			userId: UserIdSchema.nullable(),
			isGuest: z.boolean(),
			displayName: UserNameSchema,
			commitmentAnswers: z.record(
				QuestionIdSchema,
				z.enum(["yes", "no"]).nullable(),
			),
			preferenceAnswers: z.record(QuestionIdSchema, z.string().nullable()),
			bringingKigurumis: z.array(BringingKigurumiSchema),
		}),
	),
});

export const SaveGuestAnswerRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	answerId: AnswerIdSchema.optional(),
	respondentName: UserNameSchema,
	commitmentAnswers: z.array(
		z.object({
			questionId: QuestionIdSchema,
			answer: z.enum(["yes", "no"]).nullable(),
		}),
	),
	preferenceAnswers: z.array(
		z.object({ questionId: QuestionIdSchema, answer: z.string().nullable() }),
	),
	bringingKigurumis: z.array(BringingKigurumiSchema).default([]),
});
export type SaveGuestAnswerRequest = z.infer<
	typeof SaveGuestAnswerRequestSchema
>;

export const ManageGuestAnswerRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	answerId: AnswerIdSchema,
});
export type ManageGuestAnswerRequest = z.infer<
	typeof ManageGuestAnswerRequestSchema
>;
export type GetParticipantAnswerTableResponse = z.infer<
	typeof GetParticipantAnswerTableResponseSchema
>;
