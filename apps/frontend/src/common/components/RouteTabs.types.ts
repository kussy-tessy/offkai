import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { RouteLocationRaw } from "vue-router";

export interface RouteTabItem {
	label: string;
	to: RouteLocationRaw;
	icon?: IconDefinition;
	exact?: boolean;
}
