import { z } from "zod";
import {
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
	commitmentQuestions: z.array(QuestionSchema),
	preferenceQuestions: z.array(QuestionSchema),
	askBringingKigurumi: z.boolean(),
	participants: z.array(
		z.object({
			userId: UserIdSchema,
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
export type GetParticipantAnswerTableResponse = z.infer<
	typeof GetParticipantAnswerTableResponseSchema
>;
