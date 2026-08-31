import {
  faComments,
  faCoins,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import type { RouteTabItem } from "@/common/components/RouteTabs.types";

export const createParticipantManagementTabs = (
  eventId: string,
  access: { discord: boolean; finance: boolean; answers: boolean } = { discord: true, finance: true, answers: true },
): RouteTabItem[] => [
  {
    label: "Discord",
    to: `/offkai/${eventId}/participant-management/discord`,
    icon: faComments,
  },
  {
    label: "参加費",
    to: `/offkai/${eventId}/participant-management/finance`,
    icon: faCoins,
    exact: false,
  },
  {
    label: "回答表",
    to: `/offkai/${eventId}/participant-management/answers`,
    icon: faTable,
  },
].filter((_, index) => [access.discord, access.finance, access.answers][index]);
