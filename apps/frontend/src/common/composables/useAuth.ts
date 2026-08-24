import type { GetMeResponse } from "@offkai/core";
import { ref } from "vue";
import { getApiBaseUrl, useApi } from "./useApi";

const user = ref<GetMeResponse | null>(null);
const loading = ref(false);

async function fetchMe() {
	const { get } = useApi();
	try {
		const data = await get<GetMeResponse>("/me");
		user.value = data;
	} catch {
		user.value = null;
	} finally {
		loading.value = false;
	}
}

async function login(loginId: string, password: string) {
	const { post } = useApi();
	await post("/auth/login", { loginId, password });
	await fetchMe();
}

async function logout() {
	const { post } = useApi();
	await post("/auth/logout");
	user.value = null;
}

async function updateName(name: string) {
	const { put } = useApi();
	const data = await put<GetMeResponse>("/me/name", { name });
	user.value = data;
}

async function changePassword(currentPassword: string, newPassword: string) {
	const { put } = useApi();
	await put("/me/password", { currentPassword, newPassword });
	user.value = null;
}

async function setPasswordCredential(loginId: string, password: string) {
	const { post } = useApi();
	const data = await post<GetMeResponse>("/me/password-credential", {
		loginId,
		password,
	});
	user.value = data;
}

function loginWithDiscord() {
	window.location.assign(`${getApiBaseUrl()}/auth/discord?flow=login`);
}

async function connectDiscord(flow: "account" | "onboarding" = "account") {
	const { post } = useApi();
	await post("/auth/refresh");
	const url = new URL(`${getApiBaseUrl()}/auth/discord`);
	url.searchParams.set("flow", flow);
	window.location.assign(url);
}

async function disconnectDiscord() {
	const { del } = useApi();
	const data = await del<GetMeResponse>("/me/discord");
	user.value = data;
}

export function useAuth() {
	return {
		user,
		loading,
		fetchMe,
		login,
		logout,
		updateName,
		changePassword,
		setPasswordCredential,
		loginWithDiscord,
		connectDiscord,
		disconnectDiscord,
	};
}
