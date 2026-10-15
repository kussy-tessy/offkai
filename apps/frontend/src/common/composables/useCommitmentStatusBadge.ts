import { onMounted, onUnmounted, ref } from "vue";
import type { BadgeColor } from "../components/MyBadge.colors";

export const useCommitmentStatusBadge = () => {
	const capacityBadgeColor = (
		yesCount: number,
		capacity: number | null,
	): BadgeColor => {
		if (capacity === null || capacity <= 0) return "gray";
		if (yesCount >= capacity) return "red";
		if (yesCount / capacity >= 0.7) return "yellow";
		return "green";
	};

	const HOUR_MS = 60 * 60 * 1000;
	const DAY_MS = 24 * HOUR_MS;
	const JST_OFFSET_MS = 9 * HOUR_MS;

	const now = ref(Date.now());
	let clockTimer: ReturnType<typeof setInterval> | undefined;

	onMounted(() => {
		clockTimer = setInterval(() => {
			now.value = Date.now();
		}, 60 * 1000);
	});

	onUnmounted(() => {
		if (clockTimer !== undefined) clearInterval(clockTimer);
	});

	const calendarDaysUntil = (deadlineTime: number) => {
		const todayInJst = Math.floor((now.value + JST_OFFSET_MS) / DAY_MS);
		const deadlineDateInJst = Math.floor(
			(deadlineTime + JST_OFFSET_MS) / DAY_MS,
		);
		return deadlineDateInJst - todayInJst;
	};

	const deadlineLabel = (deadline: string) => {
		const deadlineTime = new Date(deadline).getTime();
		const remainingMs = deadlineTime - now.value;
		if (remainingMs < 0) return "締切済み";

		const days = calendarDaysUntil(deadlineTime);
		if (days === 0) {
			if (remainingMs < HOUR_MS) return "まもなく";
			return `あと${Math.ceil(remainingMs / HOUR_MS)}時間`;
		}
		return `あと${days}日`;
	};

	const deadlineBadgeColor = (deadline: string): BadgeColor => {
		const deadlineTime = new Date(deadline).getTime();
		if (deadlineTime < now.value) return "gray";

		const days = calendarDaysUntil(deadlineTime);
		if (days === 0) return "red";
		if (days <= 3) return "yellow";
		return "blue";
	};
	return { capacityBadgeColor, deadlineLabel, deadlineBadgeColor, now };
};
