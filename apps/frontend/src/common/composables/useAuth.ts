import { ref } from "vue";
import { useApi } from "./useApi";

type User = any;

const { get, post } = useApi();
const user = ref<User | null>(null);
const loading = ref(true);

async function fetchMe() {
  try {
    const data = await get<User>("/me");
    user.value = data.user;
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
