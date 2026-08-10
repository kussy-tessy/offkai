import {
	faComments,
	faCoins,
	faTable,
} from "@fortawesome/free-solid-svg-icons";
import type { RouteTabItem } from "@/common/components/RouteTabs.types";

export const createParticipantManagementTabs = (
	eventId: string,
): RouteTabItem[] => [
	{
		label: "Discord",
		to: `/offkai/${eventId}/participants/discord`,
		icon: faComments,
	},
	{
		label: "金銭管理",
		to: `/offkai/${eventId}/participants/payments`,
		icon: faCoins,
	},
	{
		label: "回答表",
		to: `/offkai/${eventId}/participants/answers`,
		icon: faTable,
	},
];
