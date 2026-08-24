import type { GetEventFinanceResponse, Unbrand } from "@offkai/core";

export type Finance = Unbrand<GetEventFinanceResponse>;
export type SettlementCategory = Finance["categories"][number];
export type FinanceParticipant = Finance["participants"][number];

export type SettlementCategoryInput = {
  name: string;
  baseParticipationFeeAmount: number;
  commitmentQuestionId: string | null;
};

export type ExtraChargeInput = {
  title: string;
  amount: number;
  note: string | null;
};
