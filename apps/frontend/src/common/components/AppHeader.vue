<template>
  <header class="w-full border-b border-sky-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
      <RouterLink to="/dashboard" class="text-xl font-bold tracking-wide text-sky-800 md:text-3xl">
        オフ会参加管理システム
      </RouterLink>

      <div v-if="user" class="flex items-center gap-3">
        <span class="border-l border-sky-300 pl-3 text-sm font-semibold text-sky-900">
          {{ user.name }}さん
        </span>
        <button type="button" class="rounded px-3 py-2 text-sm text-red-700 transition hover:bg-red-50"
          @click="handleLogout">
          ログアウト
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router";
  import { useAuth } from "@/common/composables";

  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      await router.push("/login");
    }
  };
</script>
