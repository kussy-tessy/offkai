// Keep complete Tailwind classes here so all badges share the same palette.
export const badgeColors = {
	teal: "border-teal-200 bg-teal-50 text-teal-700",
	blue: "border-sky-200 bg-sky-50 text-sky-700",
	yellow: "border-amber-200 bg-amber-50 text-amber-700",
	green: "border-emerald-200 bg-emerald-50 text-emerald-700",
	red: "border-rose-200 bg-rose-50 text-rose-700",
	gray: "border-slate-200 bg-slate-50 text-slate-700",
	orange: "border-orange-200 bg-orange-50 text-orange-700",
	cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
	pink: "border-pink-200 bg-pink-50 text-pink-700",
	purple: "border-violet-200 bg-violet-50 text-violet-700",
	lime: "border-lime-200 bg-lime-50 text-lime-700",
	indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
	white: "border-slate-300 bg-white text-slate-700",
	black: "border-slate-900 bg-slate-900 text-white",
} as const;
export type BadgeColor = keyof typeof badgeColors;
