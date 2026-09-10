// Only root-relative application URLs may be used after authentication.
export function safeLoginRedirect(value: unknown): string | undefined {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		/[\\\u0000-\u0020\u007f]/.test(value) ||
		value.length > 3000
	) {
		return undefined;
	}
	try {
		return encodeURIComponent(value).length <= 3000 ? value : undefined;
	} catch {
		return undefined;
	}
}
