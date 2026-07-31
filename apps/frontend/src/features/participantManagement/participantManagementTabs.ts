import { faComments, faCoins } from "@fortawesome/free-solid-svg-icons";
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
];
