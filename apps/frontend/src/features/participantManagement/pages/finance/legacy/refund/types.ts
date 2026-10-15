import type { GetEventRefundResponse, Unbrand } from "@offkai/core";

export type RefundPage = Unbrand<GetEventRefundResponse>;
export type RefundParticipant = RefundPage["participants"][number];
