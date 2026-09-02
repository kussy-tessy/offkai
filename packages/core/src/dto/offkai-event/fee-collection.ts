import { z } from "zod";
import {
	OffkaiEventIdSchema,
	PaymentAmountSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const GetEventFeeCollectionRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type GetEventFeeCollectionRequest = z.infer<
	typeof GetEventFeeCollectionRequestSchema
>;

export const GetEventFeeCollectionResponseSchema = z.object({
	feeCalculationLockedAt: z.string().datetime().nullable(),
	categories: z.array(
		z.object({
			name: z.string(),
			members: z.array(
				z.object({
					userId: UserIdSchema,
					effectiveAmount: PaymentAmountSchema,
				}),
				),
			}),
	),
	participants: z.array(
		z.object({
			userId: UserIdSchema,
			displayName: UserNameSchema,
			note: z.string().nullable(),
			collectionNote: z.string().nullable(),
			chargeAmount: PaymentAmountSchema,
			collectedAt: z.string().datetime().nullable(),
			collectedByName: UserNameSchema.nullable(),
			extraCharges: z.array(
				z.object({
					title: z.string(),
					amount: PaymentAmountSchema,
				}),
			),
		}),
	),
});
export type GetEventFeeCollectionResponse = z.infer<
	typeof GetEventFeeCollectionResponseSchema
>;
