import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
	"VALIDATION_ERROR",
	"INVALID_CREDENTIALS",
	"LOGIN_ID_ALREADY_EXISTS",
	"UNAUTHORIZED",
	"AUTHENTICATION_REQUIRED",
	"FORBIDDEN",
	"EVENT_ACCESS_DENIED",
	"DISCORD_MEMBERSHIP_CHECK_FAILED",
	"API_NOT_FOUND",
	"EVENT_NOT_FOUND",
	"SERIES_NOT_FOUND",
	"ANSWER_NOT_FOUND",
	"RESPONDENT_NOT_FOUND",
	"KIGURUMI_NOT_FOUND",
	"PHOTO_SHARE_NOT_FOUND",
	"APPLICATION_NOT_STARTED",
	"CONFLICT",
	"INTERNAL_SERVER_ERROR",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorResponseSchema = z.object({
	code: ApiErrorCodeSchema,
	message: z.string(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
