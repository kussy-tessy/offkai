export function isPassed(target: Date, reference: Date) {
	return target.getTime() > reference.getTime();
}

export function format(dateArg: Date | string, includesTime = true) {
	const date = typeof dateArg === "string" ? new Date(dateArg) : dateArg;
	console.log({ date })
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

export function preprocessDatetime(v: unknown) {
	return typeof v === "string" ? `${v.replace(" ", "T")}:00Z` : v;
}