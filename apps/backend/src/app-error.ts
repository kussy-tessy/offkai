import type { ApiErrorCode } from "@offkai/core";
import { ZodError } from "zod";

export type AppErrorCode = Exclude<ApiErrorCode, "INTERNAL_SERVER_ERROR">;

export const appErrorStatusCodes: Record<AppErrorCode, number> = {
	VALIDATION_ERROR: 400,
	INVALID_CREDENTIALS: 401,
	LOGIN_ID_ALREADY_EXISTS: 409,
	UNAUTHORIZED: 401,
	AUTHENTICATION_REQUIRED: 401,
	FORBIDDEN: 403,
	EVENT_ACCESS_DENIED: 403,
	DISCORD_MEMBERSHIP_CHECK_FAILED: 503,
	API_NOT_FOUND: 404,
	EVENT_NOT_FOUND: 404,
	SERIES_NOT_FOUND: 404,
	ANSWER_NOT_FOUND: 404,
	RESPONDENT_NOT_FOUND: 404,
	KIGURUMI_NOT_FOUND: 404,
	PHOTO_SHARE_NOT_FOUND: 404,
	APPLICATION_NOT_STARTED: 403,
	CONFLICT: 409,
};

export class AppError extends Error {
	constructor(
		readonly code: AppErrorCode,
		message: string,
	) {
		super(message);
		this.name = "AppError";
	}
}

export function runBusinessRule<T>(operation: () => T): T {
	try {
		return operation();
	} catch (error) {
		if (error instanceof AppError || error instanceof ZodError) {
			throw error;
		}

		if (
			error instanceof Error &&
			error.constructor === Error &&
			error.message !== "予期せぬエラー"
		) {
			const code = error.message.includes("締切人数に到達")
				? "CONFLICT"
				: "VALIDATION_ERROR";
			throw new AppError(code, error.message);
		}

		throw error;
	}
}
