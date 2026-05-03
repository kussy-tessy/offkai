import type { GetMeResponse } from "@offkai/core";
import { ref } from "vue";
import { useApi } from "./useApi";

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

export function useAuth() {
  return {
    user,
    loading,
    fetchMe,
    login,
    logout,
  };
}
