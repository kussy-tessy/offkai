import { z } from "zod";
import {
	OffkaiEventIdSchema,
	PaymentAmountSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const ParticipantPaymentSchema = z.object({
	userId: UserIdSchema,
	displayName: UserNameSchema,
	amount: PaymentAmountSchema,
	collected: z.boolean(),
	changeReturned: z.boolean(),
});
export type ParticipantPayment = z.infer<typeof ParticipantPaymentSchema>;

export const GetParticipantPaymentsRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetParticipantPaymentsRequest = z.infer<
	typeof GetParticipantPaymentsRequestSchema
>;

export const GetParticipantPaymentsResponseSchema = z.object({
	participants: z.array(ParticipantPaymentSchema),
});
export type GetParticipantPaymentsResponse = z.infer<
	typeof GetParticipantPaymentsResponseSchema
>;

export const UpdateParticipantPaymentRequestSchema = z
	.object({
		eventId: OffkaiEventIdSchema,
		userId: UserIdSchema,
		amount: PaymentAmountSchema,
		collected: z.boolean(),
		changeReturned: z.boolean(),
	})
	.superRefine((value, ctx) => {
		if (!value.collected && value.changeReturned) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["changeReturned"],
				message: "未徴収の場合、おつり返金済みにはできません",
			});
		}
	});
export type UpdateParticipantPaymentRequest = z.infer<
	typeof UpdateParticipantPaymentRequestSchema
>;

export const UpdateParticipantPaymentResponseSchema = ParticipantPaymentSchema;
export type UpdateParticipantPaymentResponse = ParticipantPayment;
