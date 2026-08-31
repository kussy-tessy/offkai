import {
	type OffkaiEventId,
	type StaffPermissions,
	StaffPermissionsSchema,
	type UserId,
} from "@offkai/core";
import { AppError } from "../app-error";
import { prisma } from "../repository/prisma";

export type StaffPermissionRequirement =
	| { area: "eventManagement" }
	| { area: "answerManagement"; level: "read" | "edit" | "delete" }
	| { area: "discordRole"; level: "read" | "assign" | "manage" }
	| { area: "feeCalculation"; level: "read" | "edit" | "confirm" }
	| { area: "feeCollection"; level: "read" | "record" }
	| { area: "settlement"; level: "read" | "edit" | "confirm" }
	| { area: "refund"; level: "read" | "record" };

const levels = {
	answerManagement: { read: 1, edit: 2, delete: 3 },
	discordRole: { none: 0, read: 1, assign: 2, manage: 3 },
	feeCalculation: { none: 0, read: 1, edit: 2, confirm: 3 },
	feeCollection: { none: 0, read: 1, record: 2 },
	settlement: { none: 0, read: 1, edit: 2, confirm: 3 },
	refund: { none: 0, read: 1, record: 2 },
} as const;

export async function getEventAuthorizationContext(
	eventId: OffkaiEventId,
	userId: UserId,
) {
	const event = await prisma.offkaiEvent.findUnique({
		where: { id: eventId },
		select: {
			series: {
				select: {
					staffPermissions: true,
					members: { where: { userId }, select: { role: true } },
				},
			},
			answers: { where: { userId }, select: { id: true }, take: 1 },
		},
	});
	if (!event) throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
	return {
		role: event.series.members[0]?.role ?? null,
		isParticipant: event.answers.length > 0,
		permissions: StaffPermissionsSchema.parse(event.series.staffPermissions),
	};
}

export function hasStaffPermission(
	permissions: StaffPermissions,
	requirement: StaffPermissionRequirement,
): boolean {
	if (requirement.area === "eventManagement") return permissions.eventManagement;
	const areaLevels = levels[requirement.area] as Record<string, number>;
	return areaLevels[permissions[requirement.area]] >= areaLevels[requirement.level];
}

export async function requireEventPermission(
	eventId: OffkaiEventId,
	userId: UserId,
	requirement: StaffPermissionRequirement,
): Promise<void> {
	const context = await getEventAuthorizationContext(eventId, userId);
	if (context.role === "owner") return;
	if (
		context.role !== "staff" ||
		!context.isParticipant ||
		!hasStaffPermission(context.permissions, requirement)
	) {
		throw new AppError("FORBIDDEN", "この操作を行う権限がありません。");
	}
}

export async function requireAnyEventPermission(
	eventId: OffkaiEventId,
	userId: UserId,
	requirements: StaffPermissionRequirement[],
): Promise<void> {
	const context = await getEventAuthorizationContext(eventId, userId);
	if (context.role === "owner") return;
	if (
		context.role !== "staff" ||
		!context.isParticipant ||
		!requirements.some((requirement) =>
			hasStaffPermission(context.permissions, requirement),
		)
	) {
		throw new AppError("FORBIDDEN", "この操作を行う権限がありません。");
	}
}
