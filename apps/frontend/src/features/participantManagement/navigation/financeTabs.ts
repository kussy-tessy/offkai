import {
  faCalculator,
  faCheckToSlot,
  faReceipt,
  faMoneyBillTransfer,
} from "@fortawesome/free-solid-svg-icons";
import type { RouteTabItem } from "@/common/components/RouteTabs.types";
import type { StaffPermissions } from "@offkai/core";

export const createFinanceTabs = (eventId: string, permissions?: StaffPermissions | null): RouteTabItem[] => [
  {
    label: "参加費計算",
    to: `/offkai/${eventId}/participant-management/finance/calculation`,
    icon: faCalculator,
  },
  {
    label: "参加費徴収",
    to: `/offkai/${eventId}/participant-management/finance/collection`,
    icon: faCheckToSlot,
  },
  {
    label: "経費精算",
    to: `/offkai/${eventId}/participant-management/finance/settlement`,
    icon: faReceipt,
  },
  {
    label: "返金",
    to: `/offkai/${eventId}/participant-management/finance/refund`,
    icon: faMoneyBillTransfer,
  },
].filter((_, index) => !permissions || [permissions.feeCalculation, permissions.feeCollection, permissions.settlement, permissions.refund][index] !== "none");
