import { z } from "zod";
import {
	OffkaiEventIdSchema,
	PaymentAmountSchema,
	SettlementExpenseIdSchema,
	SettlementCategoryIdSchema,
	SettlementIncomeIdSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

const EventRouteSchema = z.object({ eventId: OffkaiEventIdSchema });
const ExpenseRouteSchema = EventRouteSchema.extend({
	expenseId: SettlementExpenseIdSchema,
});
const IncomeRouteSchema = EventRouteSchema.extend({
	incomeId: SettlementIncomeIdSchema,
});

export const SettlementRecipientInputSchema = z.object({
	userId: UserIdSchema,
	amount: PaymentAmountSchema,
});

const SettlementExpenseInputSchema = z.object({
	categoryId: SettlementCategoryIdSchema,
	title: z.string(),
	amount: PaymentAmountSchema.nullable(),
	note: z.string().nullable().default(null),
	recipients: z.array(SettlementRecipientInputSchema),
});

export const GetEventSettlementRequestSchema = EventRouteSchema;
export type GetEventSettlementRequest = z.infer<
	typeof GetEventSettlementRequestSchema
>;

export const CreateSettlementExpenseRequestSchema = EventRouteSchema.merge(
	SettlementExpenseInputSchema,
);
export type CreateSettlementExpenseRequest = z.infer<
	typeof CreateSettlementExpenseRequestSchema
>;

export const UpdateSettlementExpenseRequestSchema = ExpenseRouteSchema.merge(
	SettlementExpenseInputSchema,
);
export type UpdateSettlementExpenseRequest = z.infer<
	typeof UpdateSettlementExpenseRequestSchema
>;

export const DeleteSettlementExpenseRequestSchema = ExpenseRouteSchema;
export type DeleteSettlementExpenseRequest = z.infer<
	typeof DeleteSettlementExpenseRequestSchema
>;

const SettlementIncomeInputSchema = z.object({
	categoryId: SettlementCategoryIdSchema,
	title: z.string(),
	amount: PaymentAmountSchema,
	note: z.string().nullable().default(null),
});

export const CreateSettlementIncomeRequestSchema = EventRouteSchema.merge(
	SettlementIncomeInputSchema,
);
export type CreateSettlementIncomeRequest = z.infer<
	typeof CreateSettlementIncomeRequestSchema
>;

export const UpdateSettlementIncomeRequestSchema = IncomeRouteSchema.merge(
	SettlementIncomeInputSchema,
);
export type UpdateSettlementIncomeRequest = z.infer<
	typeof UpdateSettlementIncomeRequestSchema
>;

export const DeleteSettlementIncomeRequestSchema = IncomeRouteSchema;
export type DeleteSettlementIncomeRequest = z.infer<
	typeof DeleteSettlementIncomeRequestSchema
>;

const RationalAmountSchema = z.object({
	numerator: z.number().int(),
	denominator: z.number().int().positive(),
	displayAmount: z.number(),
});

const SettlementExpenseResponseSchema = z.object({
	id: SettlementExpenseIdSchema,
	title: z.string(),
	amount: PaymentAmountSchema,
	note: z.string().nullable(),
	recipients: z.array(SettlementRecipientInputSchema),
});

const SettlementIncomeResponseSchema = z.object({
	id: SettlementIncomeIdSchema,
	title: z.string(),
	amount: PaymentAmountSchema,
	note: z.string().nullable(),
});

const SettlementParticipantBreakdownSchema = z.object({
	userId: UserIdSchema,
	displayName: UserNameSchema,
	isCategoryMember: z.boolean(),
	commonRefund: RationalAmountSchema.nullable(),
	recipientAmount: PaymentAmountSchema,
	total: RationalAmountSchema,
});

const SettlementCategoryResultSchema = z.object({
	id: SettlementCategoryIdSchema,
	name: z.string(),
	participantFeeIncome: PaymentAmountSchema,
	additionalIncomeTotal: PaymentAmountSchema,
	totalIncome: PaymentAmountSchema,
	normalExpenseTotal: PaymentAmountSchema,
	recipientExpenseTotal: PaymentAmountSchema,
	commonRefundPool: z.number().int(),
	memberCount: z.number().int().nonnegative(),
	expenses: z.array(SettlementExpenseResponseSchema),
	incomes: z.array(SettlementIncomeResponseSchema),
	participantBreakdowns: z.array(SettlementParticipantBreakdownSchema),
});

export const GetEventSettlementResponseSchema = z.object({
	feeCalculationLockedAt: z.string().datetime().nullable(),
	refundLockedAt: z.string().datetime().nullable(),
	participants: z.array(
		z.object({ userId: UserIdSchema, displayName: UserNameSchema }),
	),
	categories: z.array(SettlementCategoryResultSchema),
	extraChargesExcluded: z.boolean(),
});
export type GetEventSettlementResponse = z.infer<
	typeof GetEventSettlementResponseSchema
>;
