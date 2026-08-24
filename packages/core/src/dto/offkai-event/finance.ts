import { z } from "zod";
import {
	ExtraChargeIdSchema,
	OffkaiEventIdSchema,
	PaymentAmountSchema,
	QuestionIdSchema,
	RefundRoundingUnitSchema,
	SettlementCategoryIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

const EventFinanceRouteSchema = z.object({ eventId: OffkaiEventIdSchema });
const SettlementCategoryRouteSchema = EventFinanceRouteSchema.extend({
	categoryId: SettlementCategoryIdSchema,
});
const FinanceParticipantRouteSchema = EventFinanceRouteSchema.extend({
	userId: UserIdSchema,
});
const ExtraChargeRouteSchema = FinanceParticipantRouteSchema.extend({
	extraChargeId: ExtraChargeIdSchema,
});

export const GetEventFinanceRequestSchema = EventFinanceRouteSchema;
export type GetEventFinanceRequest = z.infer<
	typeof GetEventFinanceRequestSchema
>;

export const FinanceQuestionSchema = z.object({
	id: QuestionIdSchema,
	questionShort: z.string(),
	archived: z.boolean(),
});

export const FinanceCategoryMemberSchema = z.object({
	userId: UserIdSchema,
	amountOverride: PaymentAmountSchema.nullable(),
	effectiveAmount: PaymentAmountSchema,
});

export const FinanceSettlementCategorySchema = z.object({
	id: SettlementCategoryIdSchema,
	name: z.string(),
	baseParticipationFeeAmount: PaymentAmountSchema,
	commitmentQuestionId: QuestionIdSchema.nullable(),
	members: z.array(FinanceCategoryMemberSchema),
});

export const FinanceExtraChargeSchema = z.object({
	id: ExtraChargeIdSchema,
	title: z.string(),
	amount: PaymentAmountSchema,
	note: z.string().nullable(),
});

export const FinanceParticipantSchema = z.object({
	userId: UserIdSchema,
	displayName: UserNameSchema,
	note: z.string().nullable(),
	chargeAmount: PaymentAmountSchema,
	collectedAt: z.string().datetime().nullable(),
	refundAmount: PaymentAmountSchema.nullable(),
	refundCalculatedAt: z.string().datetime().nullable(),
	refundedAt: z.string().datetime().nullable(),
	extraCharges: z.array(FinanceExtraChargeSchema),
});

export const GetEventFinanceResponseSchema = z.object({
	refundRoundingUnit: RefundRoundingUnitSchema,
	feeCalculationLockedAt: z.string().datetime().nullable(),
	collectionStartedAt: z.string().datetime().nullable(),
	settlementLockedAt: z.string().datetime().nullable(),
	refundStartedAt: z.string().datetime().nullable(),
	questions: z.array(FinanceQuestionSchema),
	categories: z.array(FinanceSettlementCategorySchema),
	participants: z.array(FinanceParticipantSchema),
});
export type GetEventFinanceResponse = z.infer<
	typeof GetEventFinanceResponseSchema
>;

export const UpdateFeeCalculationLockRequestSchema = EventFinanceRouteSchema;
export type UpdateFeeCalculationLockRequest = z.infer<
	typeof UpdateFeeCalculationLockRequestSchema
>;

export const UpdateFinanceSettingsRequestSchema =
	EventFinanceRouteSchema.extend({
		refundRoundingUnit: RefundRoundingUnitSchema,
	});
export type UpdateFinanceSettingsRequest = z.infer<
	typeof UpdateFinanceSettingsRequestSchema
>;

const SettlementCategoryInputSchema = z.object({
	name: z.string(),
	baseParticipationFeeAmount: PaymentAmountSchema,
	commitmentQuestionId: QuestionIdSchema.nullable(),
});

export const CreateSettlementCategoryRequestSchema =
	EventFinanceRouteSchema.merge(SettlementCategoryInputSchema);
export type CreateSettlementCategoryRequest = z.infer<
	typeof CreateSettlementCategoryRequestSchema
>;

export const UpdateSettlementCategoryRequestSchema =
	SettlementCategoryRouteSchema.merge(SettlementCategoryInputSchema);
export type UpdateSettlementCategoryRequest = z.infer<
	typeof UpdateSettlementCategoryRequestSchema
>;

export const DeleteSettlementCategoryRequestSchema =
	SettlementCategoryRouteSchema;
export type DeleteSettlementCategoryRequest = z.infer<
	typeof DeleteSettlementCategoryRequestSchema
>;

export const SyncSettlementCategoryMembersRequestSchema =
	SettlementCategoryRouteSchema;
export type SyncSettlementCategoryMembersRequest = z.infer<
	typeof SyncSettlementCategoryMembersRequestSchema
>;
export const SyncSettlementCategoryMembersResponseSchema = z.object({
	addedCount: z.number().int().nonnegative(),
	removedCount: z.number().int().nonnegative(),
	resetOverrideCount: z.number().int().nonnegative(),
});
export type SyncSettlementCategoryMembersResponse = z.infer<
	typeof SyncSettlementCategoryMembersResponseSchema
>;

export const UpdateSettlementCategoryMemberRequestSchema =
	SettlementCategoryRouteSchema.extend({
		userId: UserIdSchema,
		amountOverride: PaymentAmountSchema.nullable(),
	});
export type UpdateSettlementCategoryMemberRequest = z.infer<
	typeof UpdateSettlementCategoryMemberRequestSchema
>;

export const DeleteSettlementCategoryMemberRequestSchema =
	SettlementCategoryRouteSchema.extend({ userId: UserIdSchema });
export type DeleteSettlementCategoryMemberRequest = z.infer<
	typeof DeleteSettlementCategoryMemberRequestSchema
>;

const ExtraChargeInputSchema = z.object({
	title: z.string(),
	amount: PaymentAmountSchema,
	note: z.string().nullable().default(null),
});

export const CreateParticipantExtraChargeRequestSchema =
	FinanceParticipantRouteSchema.merge(ExtraChargeInputSchema);
export type CreateParticipantExtraChargeRequest = z.infer<
	typeof CreateParticipantExtraChargeRequestSchema
>;

export const UpdateParticipantExtraChargeRequestSchema =
	ExtraChargeRouteSchema.merge(ExtraChargeInputSchema);
export type UpdateParticipantExtraChargeRequest = z.infer<
	typeof UpdateParticipantExtraChargeRequestSchema
>;

export const DeleteParticipantExtraChargeRequestSchema = ExtraChargeRouteSchema;
export type DeleteParticipantExtraChargeRequest = z.infer<
	typeof DeleteParticipantExtraChargeRequestSchema
>;

export const UpdateParticipantFinanceNoteRequestSchema =
	FinanceParticipantRouteSchema.extend({ note: z.string().nullable() });
export type UpdateParticipantFinanceNoteRequest = z.infer<
	typeof UpdateParticipantFinanceNoteRequestSchema
>;

export const UpdateParticipantCollectionRequestSchema =
	FinanceParticipantRouteSchema.extend({ collected: z.boolean() });
export type UpdateParticipantCollectionRequest = z.infer<
	typeof UpdateParticipantCollectionRequestSchema
>;
