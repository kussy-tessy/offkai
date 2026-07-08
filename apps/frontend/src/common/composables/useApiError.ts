import { ApiErrorResponseSchema, type ApiErrorResponse } from "@offkai/core";
import axios from "axios";

export const getApiError = (cause: unknown): ApiErrorResponse | null => {
	if (!axios.isAxiosError(cause)) return null;

	const result = ApiErrorResponseSchema.safeParse(cause.response?.data);
	return result.success ? result.data : null;
};

export const getApiErrorMessage = (cause: unknown, fallback: string): string =>
	getApiError(cause)?.message ?? fallback;
