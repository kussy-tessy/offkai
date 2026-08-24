import {
  faCalculator,
  faCheckToSlot,
  faReceipt,
  faMoneyBillTransfer,
} from "@fortawesome/free-solid-svg-icons";
import type { RouteTabItem } from "@/common/components/RouteTabs.types";

export const createFinanceTabs = (eventId: string): RouteTabItem[] => [
  {
    label: "参加費計算",
    to: `/offkai/${eventId}/participants/finance/calculation`,
    icon: faCalculator,
  },
  {
    label: "参加費徴収",
    to: `/offkai/${eventId}/participants/finance/collection`,
    icon: faCheckToSlot,
  },
  {
    label: "経費精算",
    to: `/offkai/${eventId}/participants/finance/settlement`,
    icon: faReceipt,
  },
  {
    label: "返金",
    to: `/offkai/${eventId}/participants/finance/refund`,
    icon: faMoneyBillTransfer,
  },
];
