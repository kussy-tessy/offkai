import { createHash, randomBytes, randomUUID } from "node:crypto";

export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type RefreshToken = {
	sessionId: string;
	secret: string;
	value: string;
};

export function createRefreshToken(
	sessionId: string = randomUUID(),
): RefreshToken {
	const secret = randomBytes(32).toString("base64url");
	return { sessionId, secret, value: `${sessionId}.${secret}` };
}

export function parseRefreshToken(
	value: string | undefined,
): RefreshToken | null {
	if (!value) return null;
	const separator = value.indexOf(".");
	if (separator <= 0 || separator === value.length - 1) return null;

	const sessionId = value.slice(0, separator);
	const secret = value.slice(separator + 1);
	if (
		!/^[0-9a-f-]{36}$/i.test(sessionId) ||
		!/^[A-Za-z0-9_-]{43}$/.test(secret)
	) {
		return null;
	}
	return { sessionId, secret, value };
}

export function hashRefreshToken(secret: string): string {
	return createHash("sha256").update(secret).digest("hex");
}

export function refreshTokenExpiresAt(now = new Date()): Date {
	return new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000);
}
