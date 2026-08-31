import type { z } from "zod";
import { StaffPermissionsSchema } from "../../schema";

export const GetStaffPermissionsResponseSchema = StaffPermissionsSchema;
export type GetStaffPermissionsResponse = z.infer<typeof GetStaffPermissionsResponseSchema>;

export const UpdateStaffPermissionsRequestSchema = StaffPermissionsSchema;
export type UpdateStaffPermissionsRequest = z.infer<typeof UpdateStaffPermissionsRequestSchema>;
