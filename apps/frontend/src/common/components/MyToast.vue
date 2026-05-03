<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed left-1/2 top-4 z-50 w-[min(92vw,380px)] -translate-x-1/2">
      <TransitionGroup name="toast" tag="div" class="space-y-2">
        <div v-for="toast in toasts" :key="toast.id" class="pointer-events-auto rounded-lg border px-4 py-3 shadow-md"
          :class="toastClass(toast.type)">
          <div class="flex items-start gap-3">
            <p class="flex-1 text-sm leading-5">{{ toast.message }}</p>
            <button type="button" class="shrink-0 rounded px-1 text-sm opacity-70 hover:opacity-100"
              @click="removeToast(toast.id)" aria-label="Close toast">
              x
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { type ToastType, useToast } from "@/common/composables";

  const { toasts, removeToast } = useToast();

  const toastClass = (type: ToastType): string => {
    switch (type) {
      case "success":
        return "border-emerald-300 bg-emerald-50 text-emerald-900";
      case "error":
        return "border-rose-300 bg-rose-50 text-rose-900";
      default:
        return "border-sky-300 bg-sky-50 text-sky-900";
    }
  };
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
