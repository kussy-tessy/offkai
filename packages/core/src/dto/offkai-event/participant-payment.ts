import { z } from "zod";
import {
	OffkaiEventIdSchema,
	PaymentAmountSchema,
	QuestionIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const ParticipantPaymentCommitmentQuestionSchema = z.object({
	id: QuestionIdSchema,
	questionShort: z.string(),
});
export type ParticipantPaymentCommitmentQuestion = z.infer<
	typeof ParticipantPaymentCommitmentQuestionSchema
>;

export const ParticipantPaymentSchema = z.object({
	userId: UserIdSchema,
	displayName: UserNameSchema,
	commitmentAnswers: z.record(
		QuestionIdSchema,
		z.enum(["yes", "no"]).nullable(),
	),
	amount: PaymentAmountSchema,
	collected: z.boolean(),
});
export type ParticipantPayment = z.infer<typeof ParticipantPaymentSchema>;

export const GetParticipantPaymentsRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetParticipantPaymentsRequest = z.infer<
	typeof GetParticipantPaymentsRequestSchema
>;

export const GetParticipantPaymentsResponseSchema = z.object({
	commitmentQuestions: z.array(ParticipantPaymentCommitmentQuestionSchema),
	participants: z.array(ParticipantPaymentSchema),
});
export type GetParticipantPaymentsResponse = z.infer<
	typeof GetParticipantPaymentsResponseSchema
>;

export const UpdateParticipantPaymentRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	userId: UserIdSchema,
	amount: PaymentAmountSchema,
	collected: z.boolean(),
});
export type UpdateParticipantPaymentRequest = z.infer<
	typeof UpdateParticipantPaymentRequestSchema
>;

export const UpdateParticipantPaymentResponseSchema = ParticipantPaymentSchema;
export type UpdateParticipantPaymentResponse = ParticipantPayment;
