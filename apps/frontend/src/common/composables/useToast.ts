import { ref } from "vue";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
	id: number;
	message: string;
	type: ToastType;
	duration: number;
};

type PushToastOptions = {
	type?: ToastType;
	duration?: number;
};

const DEFAULT_DURATION = 3000;
const toasts = ref<ToastItem[]>([]);
let nextToastId = 1;

const removeToast = (id: number): void => {
	toasts.value = toasts.value.filter((toast) => toast.id !== id);
};

const pushToast = (message: string, options: PushToastOptions = {}): number => {
	const id = nextToastId++;
	const duration = options.duration ?? DEFAULT_DURATION;
	const toast: ToastItem = {
		id,
		message,
		type: options.type ?? "info",
		duration,
	};

	toasts.value = [...toasts.value, toast];

	if (duration > 0) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}

	return id;
};

export const useToast = () => {
	const success = (message: string, duration?: number): number =>
		pushToast(message, { type: "success", duration });
	const error = (message: string, duration?: number): number =>
		pushToast(message, { type: "error", duration });
	const info = (message: string, duration?: number): number =>
		pushToast(message, { type: "info", duration });

	return {
		toasts,
		pushToast,
		removeToast,
		success,
		error,
		info,
	};
};
