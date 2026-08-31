<template>
  <img
    v-if="avatarUrl && !loadFailed"
    :src="avatarUrl"
    alt=""
    :class="['shrink-0 rounded-full bg-slate-100 object-cover', sizeClass]"
    loading="lazy"
    referrerpolicy="no-referrer"
    @error="loadFailed = true"
  />
  <span
    v-else
    :class="[
      'flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600',
      sizeClass,
      textSizeClass,
    ]"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    avatarUrl: string | null;
    displayName: string;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" },
);

const loadFailed = ref(false);
watch(
  () => props.avatarUrl,
  () => {
    loadFailed.value = false;
  },
);

const initial = computed(
  () => Array.from(props.displayName.trim())[0]?.toLocaleUpperCase() ?? "?",
);
const sizeClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "h-6 w-6";
    case "lg":
      return "h-12 w-12";
    default:
      return "h-8 w-8";
  }
});
const textSizeClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "text-xs";
    case "lg":
      return "text-lg";
    default:
      return "text-sm";
  }
});
</script>
