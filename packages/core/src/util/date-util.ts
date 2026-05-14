export function isPassed(target: Date, reference: Date) {
	return target.getTime() > reference.getTime();
}

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function format(dateArg: Date | string, includesTime = true) {
	const date = typeof dateArg === "string" ? new Date(dateArg) : dateArg;
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");

	if (!includesTime) {
		return `${yyyy}-${mm}-${dd}`;
	}

	const hh = String(date.getHours()).padStart(2, "0");
	const mi = String(date.getMinutes()).padStart(2, "0");

	return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function formatWithDay(dateArg: Date | string, includesTime = false) {
	const date = typeof dateArg === "string" ? new Date(dateArg) : dateArg;
	const day = DAY_OF_WEEK[date.getDay()];

	if (includesTime) {
		const dateOnly = format(date, false);
		const hh = String(date.getHours()).padStart(2, "0");
		const mi = String(date.getMinutes()).padStart(2, "0");
		return `${dateOnly}（${day}） ${hh}:${mi}`;
	}

	const base = format(date, includesTime);
	return `${base}（${day}）`;
}

export function preprocessDatetime(v: unknown) {
	if (typeof v !== "string") return v;

	const normalized = v.replace(" ", "T");
	const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized);
	const hasSeconds = /T\d{2}:\d{2}:\d{2}/.test(normalized);
	const withSeconds = hasSeconds ? normalized : `${normalized}:00`;

	// The UI sends timezone-less local datetime strings. Treat them as JST.
	return hasTimezone ? withSeconds : `${withSeconds}+09:00`;
}