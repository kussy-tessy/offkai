<template>
  <div
    class="inline-flex items-center rounded-full border"
    :class="[
      size === 'sm' ? 'gap-1 px-2 py-0.5 text-xs' : 'gap-2 px-5 py-2 text-base',
      variant === 'default' && 'border-teal-200 bg-teal-50 text-teal-700',
    ]"
  >
    <FontAwesomeIcon v-if="icon" :icon="icon" />
    <span><slot /></span>
  </div>
</template>

<script setup lang="ts">
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

withDefaults(
  defineProps<{
    icon?: IconDefinition;
    size?: "sm" | "md";
    variant?: "default" | "custom";
  }>(),
  { size: "md", variant: "default" },
);
</script>
