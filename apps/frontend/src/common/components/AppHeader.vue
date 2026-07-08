<template>
  <header class="w-full border-b border-sky-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
      <RouterLink to="/dashboard" class="text-xl font-bold tracking-wide text-sky-800 md:text-3xl">
        オフ会参加管理システム
      </RouterLink>

      <div v-if="user" ref="menuRootRef" class="relative flex items-center gap-3">
        <span class="border-l border-sky-300 pl-3 text-sm font-semibold text-sky-900 cursor-pointer select-none"
          @click="toggleMenu">
          {{ user.name }} さん
        </span>
        <div v-if="isMenuOpen"
          class="absolute right-0 z-20 mt-24 min-w-[160px] rounded-md border border-sky-200 bg-white p-1 shadow-lg">
          <button type="button"
            class="w-full rounded px-3 py-2 text-left text-sm text-sky-800 transition hover:bg-sky-50"
            @click="handleAccount">
            アカウント設定
          </button>
          <button type="button"
            class="w-full rounded px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-50"
            @click="handleLogout">
            ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import { useAuth } from "@/common/composables";

  const router = useRouter();
  const { user, logout } = useAuth();

  const isMenuOpen = ref(false);
  const menuRootRef = ref<HTMLElement | null>(null);

  const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value;
  };

  const closeMenuIfOutside = (event: MouseEvent) => {
    const root = menuRootRef.value;
    const target = event.target;

    if (!root || !(target instanceof Node)) {
      return;
    }

    if (!root.contains(target)) {
      isMenuOpen.value = false;
    }
  };

  const handleAccount = async () => {
    isMenuOpen.value = false;
    await router.push("/account");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      isMenuOpen.value = false;
      await router.push("/login");
    }
  };

  onMounted(() => {
    document.addEventListener("click", closeMenuIfOutside);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", closeMenuIfOutside);
  });
</script>
