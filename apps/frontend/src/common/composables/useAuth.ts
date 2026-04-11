import type { GetMeResponse } from "@offkai/core";
import { ref } from "vue";
import { useApi } from "./useApi";

const { get, post } = useApi();
const user = ref<GetMeResponse | null>(null);
const loading = ref(false);

async function fetchMe() {
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
  await post("/auth/login", { loginId, password });
  await fetchMe();
}

async function logout() {
  await post("/auth/logout");
  user.value = null;
}

export function useAuth() {
  return {
    user,
    loading,
    fetchMe,
    login,
    logout,
  };
}
