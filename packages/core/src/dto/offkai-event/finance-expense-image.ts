import { z } from "zod";

export const FINANCE_EXPENSE_IMAGE_MAX_COUNT = 3;
export const FinanceExpenseImageSchema = z.object({
	id: z.string().uuid(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	url: z.string().url(),
});
export type FinanceExpenseImage = z.infer<typeof FinanceExpenseImageSchema>;
