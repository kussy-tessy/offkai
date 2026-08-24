import { z } from "zod";
import {
	OffkaiEventIdSchema,
	PaymentAmountSchema,
	RefundRoundingUnitSchema,
	SettlementCategoryIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

const EventRouteSchema = z.object({ eventId: OffkaiEventIdSchema });
const ParticipantRouteSchema = EventRouteSchema.extend({
	userId: UserIdSchema,
});

export const GetEventRefundRequestSchema = EventRouteSchema;
export type GetEventRefundRequest = z.infer<typeof GetEventRefundRequestSchema>;

export const UpdateParticipantRefundRequestSchema =
	ParticipantRouteSchema.extend({ refunded: z.boolean() });
export type UpdateParticipantRefundRequest = z.infer<
	typeof UpdateParticipantRefundRequestSchema
>;

const RationalAmountSchema = z.object({
	numerator: z.number().int(),
	denominator: z.number().int().positive(),
	displayAmount: z.number(),
});

const RefundParticipantSchema = z.object({
	userId: UserIdSchema,
	displayName: UserNameSchema,
	categoryBreakdowns: z.array(
		z.object({
			categoryId: SettlementCategoryIdSchema,
			categoryName: z.string(),
			amount: RationalAmountSchema,
		}),
	),
	unroundedTotal: RationalAmountSchema,
	proposedRefundAmount: z.number().int(),
	roundingDifference: RationalAmountSchema,
	refundAmount: PaymentAmountSchema.nullable(),
	refundedAt: z.string().datetime().nullable(),
});

export const GetEventRefundResponseSchema = z.object({
	refundRoundingUnit: RefundRoundingUnitSchema,
	settlementLockedAt: z.string().datetime().nullable(),
	refundStartedAt: z.string().datetime().nullable(),
	refundCalculatedAt: z.string().datetime().nullable(),
	canCalculate: z.boolean(),
	negativeParticipantNames: z.array(UserNameSchema),
	totalUnroundedRefundAmount: z.number().int(),
	proposedTotalRefundAmount: z.number().int(),
	totalRefundAmount: PaymentAmountSchema.nullable(),
	roundingRemainder: z.number().int(),
	participants: z.array(RefundParticipantSchema),
});
export type GetEventRefundResponse = z.infer<
	typeof GetEventRefundResponseSchema
>;
