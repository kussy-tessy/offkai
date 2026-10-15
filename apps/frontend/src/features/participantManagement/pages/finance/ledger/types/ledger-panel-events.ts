import type { LedgerResource } from "@offkai/core";
export type LedgerPanelEvents = {
	edit: [
		resource: LedgerResource,
		value?: unknown,
		personId?: string,
		categoryId?: string | null,
	];
	remove: [resource: LedgerResource, id: string, label: string];
};
