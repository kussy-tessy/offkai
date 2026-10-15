import type { LedgerCommand, LedgerPage } from "@offkai/core";
import {
	computed,
	type InjectionKey,
	inject,
	onMounted,
	provide,
	ref,
} from "vue";
import { useApi } from "@/common/composables";
export type LocalCommand = LedgerCommand extends infer C
	? C extends LedgerCommand
		? Omit<C, "revision" | "requestId">
		: never
	: never;
function createLedgerSession(eventId: () => string) {
	const api = useApi();
	const page = ref<LedgerPage | null>(null);
	const loading = ref(false);
	const busy = ref(false);
	const error = ref("");
	const expenseImageRefreshVersion = ref(0);
	const editable = computed(() => !!page.value?.active && !busy.value);
	const levels: Record<string, number> = {
		none: 0,
		read: 1,
		edit: 2,
		record: 2,
		confirm: 3,
	};
	function can(
		area: "feeCalculation" | "feeCollection" | "settlement" | "refund",
		level: string,
	) {
		return (
			!!page.value &&
			(page.value.access.owner ||
				(levels[page.value.access.permissions[area]] ?? 0) >=
					(levels[level] ?? 99))
		);
	}
	function message(cause: unknown) {
		const e = cause as {
			response?: { data?: { message?: string; error?: { message?: string } } };
			message?: string;
		};
		return (
			e.response?.data?.message ??
			e.response?.data?.error?.message ??
			e.message ??
			"操作に失敗しました。"
		);
	}
	async function load() {
		loading.value = true;
		error.value = "";
		try {
			page.value = await api.get<LedgerPage>(
				`/offkai-event/${eventId()}/finance-ledger`,
			);
		} catch (e) {
			error.value = message(e);
		} finally {
			loading.value = false;
		}
	}
	onMounted(load);
	async function send(command: LocalCommand) {
		if (!page.value || busy.value) return false;
		busy.value = true;
		error.value = "";
		try {
			page.value = await api.post<LedgerPage>(
				`/offkai-event/${eventId()}/finance-ledger/commands`,
				{
					...command,
					revision: page.value.revision,
					requestId: crypto.randomUUID(),
				},
			);
			return true;
		} catch (e) {
			error.value = message(e);
			return false;
		} finally {
			busy.value = false;
		}
	}
	async function activate() {
		if (!page.value || busy.value) return;
		busy.value = true;
		error.value = "";
		try {
			page.value = await api.post<LedgerPage>(
				`/offkai-event/${eventId()}/finance-ledger/activate`,
				{ fingerprint: page.value.fingerprint },
			);
			return true;
		} catch (e) {
			error.value = message(e);
			return false;
		} finally {
			busy.value = false;
		}
	}
	return {
		eventId: computed(eventId),
		expenseImageRefreshVersion,
		refreshExpenseImages: () => {
			expenseImageRefreshVersion.value++;
		},
		page,
		loading,
		busy,
		error,
		editable,
		can,
		load,
		send,
		activate,
	};
}
const key: InjectionKey<ReturnType<typeof createLedgerSession>> = Symbol(
	"finance-ledger-session",
);
export function provideLedgerSession(eventId: () => string) {
	const session = createLedgerSession(eventId);
	provide(key, session);
	return session;
}
export function useLedgerSession() {
	const session = inject(key);
	if (!session)
		throw new Error("Finance panels must be inside LedgerWorkspace");
	return session;
}
