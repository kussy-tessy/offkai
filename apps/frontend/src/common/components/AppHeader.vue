<template>
  <header class="relative z-30 w-full border-b border-sky-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
      <RouterLink to="/dashboard" class="brand-logo text-xl font-bold tracking-wide md:text-3xl">
        KigPla
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

<style scoped>
  .brand-logo {
    position: relative;
    display: inline-block;
    background: linear-gradient(120deg, #075985 10%, #0ea5e9 48%, #6366f1 90%);
    background-clip: text;
    color: transparent;
    text-shadow: 0 2px 12px rgb(14 165 233 / 18%);
    transition: filter 180ms ease, transform 180ms ease;
  }

  .brand-logo::after {
    position: absolute;
    right: 4%;
    bottom: -0.15rem;
    left: 4%;
    height: 2px;
    content: "";
    background: linear-gradient(90deg, transparent, #38bdf8 25%, #818cf8 75%, transparent);
    border-radius: 9999px;
    opacity: 0.65;
    transform: scaleX(0.82);
    transition: opacity 180ms ease, transform 180ms ease;
  }

  .brand-logo:hover {
    filter: saturate(1.15) brightness(1.05);
    transform: translateY(-1px);
  }

  .brand-logo:hover::after {
    opacity: 1;
    transform: scaleX(1);
  }
</style>
