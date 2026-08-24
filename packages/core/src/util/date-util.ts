export function isPassed(target: Date, reference: Date) {
	return target.getTime() > reference.getTime();
}

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"] as const;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

type DateParts = {
	year: number;
	month: number;
	day: number;
	hours: number;
	minutes: number;
	seconds: number;
	dayOfWeek: number;
};

function getJstParts(dateArg: Date | string): DateParts {
	if (typeof dateArg === "string") {
		const local = dateArg.match(
			/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
		);
		if (local) {
			const [, year, month, day, hours = "0", minutes = "0", seconds = "0"] =
				local;
			return {
				year: Number(year),
				month: Number(month),
				day: Number(day),
				hours: Number(hours),
				minutes: Number(minutes),
				seconds: Number(seconds),
				dayOfWeek: new Date(
					Date.UTC(Number(year), Number(month) - 1, Number(day)),
				).getUTCDay(),
			};
		}
	}

	const instant = dateArg instanceof Date ? dateArg : new Date(dateArg);
	const jst = new Date(instant.getTime() + JST_OFFSET_MS);
	return {
		year: jst.getUTCFullYear(),
		month: jst.getUTCMonth() + 1,
		day: jst.getUTCDate(),
		hours: jst.getUTCHours(),
		minutes: jst.getUTCMinutes(),
		seconds: jst.getUTCSeconds(),
		dayOfWeek: jst.getUTCDay(),
	};
}

export function format(dateArg: Date | string, includesTime = true) {
	const { year, month, day, hours, minutes } = getJstParts(dateArg);
	const mm = String(month).padStart(2, "0");
	const dd = String(day).padStart(2, "0");

	if (!includesTime) {
		return `${year}/${mm}/${dd}`;
	}

	const hh = String(hours).padStart(2, "0");
	const mi = String(minutes).padStart(2, "0");

	return `${year}/${mm}/${dd} ${hh}:${mi}`;
}

/** Format a JST value for date and datetime form fields. */
export function formatForForm(dateArg: Date | string, includesTime = true) {
	return format(dateArg, includesTime).replace(/\//g, "-");
}

export function formatWithSeconds(dateArg: Date | string) {
	const base = format(dateArg);
	const seconds = String(getJstParts(dateArg).seconds).padStart(2, "0");

	return `${base}:${seconds}`;
}

export function formatWithDay(dateArg: Date | string, includesTime = false) {
	const { dayOfWeek } = getJstParts(dateArg);
	const formatted = format(dateArg, includesTime);
	const [date, time] = formatted.split(" ");
	return time
		? `${date}（${DAY_OF_WEEK[dayOfWeek]}） ${time}`
		: `${date}（${DAY_OF_WEEK[dayOfWeek]}）`;
}

export function formatPeriodWithDay(
	period: { startDate: Date | string; endDate: Date | string },
	includesTime = false,
) {
	const start = formatWithDay(period.startDate, includesTime);
	const end = formatWithDay(period.endDate, includesTime);
	return start === end ? start : `${start} - ${end}`;
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
