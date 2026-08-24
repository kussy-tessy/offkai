import type { GetEventSettlementResponse, Unbrand } from "@offkai/core";

export type SettlementPage = Unbrand<GetEventSettlementResponse>;
export type SettlementCategoryResult = SettlementPage["categories"][number];
export type SettlementExpense = SettlementCategoryResult["expenses"][number];
export type SettlementIncome = SettlementCategoryResult["incomes"][number];
export type SettlementExpenseInput = {
  categoryId: string;
  title: string;
  amount: number | null;
  note: string | null;
  recipients: Array<{ userId: string; amount: number }>;
};
export type SettlementIncomeInput = {
  categoryId: string;
  title: string;
  amount: number;
  note: string | null;
};
