import {
	type FinanceLedger,
	type LedgerCommand,
	type LedgerPayment,
	LedgerPaymentSchema,
	type StaffPermissions,
} from "@offkai/core";
import {
	hasStaffPermission,
	type StaffPermissionRequirement,
} from "../../../authorization/staff-permissions";

export type LedgerAccess = { owner: boolean; permissions: StaffPermissions };
export const allowsLedger = (
	access: LedgerAccess,
	requirement: StaffPermissionRequirement,
) => access.owner || hasStaffPermission(access.permissions, requirement);
export function paymentArea(kind: LedgerPayment["kind"]) {
	if (kind === "collection" || kind === "recovery")
		return "feeCollection" as const;
	if (kind === "refund") return "refund" as const;
	return "settlement" as const;
}
export function ledgerCommandRequirements(
	state: FinanceLedger,
	command: LedgerCommand,
): StaffPermissionRequirement[] {
	if (command.action === "rounding")
		return [{ area: "settlement", level: "edit" }];
	if (command.action === "confirm")
		return [{ area: "settlement", level: "confirm" }];
	if (
		command.action === "refundPlanned" ||
		command.action === "startSettlement"
	)
		return [{ area: "refund", level: "record" }];
	if (command.action === "collectPlanned")
		return [{ area: "feeCollection", level: "record" }];
	if (command.action === "confirmCharges")
		return [{ area: "feeCalculation", level: "confirm" }];
	if (
		command.action === "createCategoryCharges" ||
		command.action === "participantCharges"
	)
		return [{ area: "feeCalculation", level: "edit" }];
	if (command.resource === "payments") {
		const incoming =
			command.action === "put"
				? LedgerPaymentSchema.parse(command.value)
				: null;
		const old = state.payments.find(
			(p) =>
				p.id ===
				(incoming?.id ?? (command.action === "remove" ? command.id : "")),
		);
		return [old, incoming]
			.filter((p): p is LedgerPayment => p !== null && p !== undefined)
			.map((p) => {
				const area = paymentArea(p.kind);
				return area === "settlement"
					? { area, level: "edit" }
					: { area, level: "record" };
			});
	}
	return [
		{
			area:
				command.resource === "categories" || command.resource === "charges"
					? "feeCalculation"
					: "settlement",
			level: "edit",
		},
	];
}
export function canReadLedgerResource(
	access: LedgerAccess,
	resource: string,
	payment?: LedgerPayment,
) {
	if (resource === "payments")
		return (
			!!payment &&
			allowsLedger(access, { area: paymentArea(payment.kind), level: "read" })
		);
	if (resource === "categories" || resource === "charges")
		return (
			allowsLedger(access, { area: "feeCalculation", level: "read" }) ||
			allowsLedger(access, { area: "feeCollection", level: "read" }) ||
			allowsLedger(access, { area: "settlement", level: "read" })
		);
	return allowsLedger(access, { area: "settlement", level: "read" });
}
