<template>
  <div
    class="inline-flex items-center rounded-full border"
    :class="[
      size === 'sm' ? 'gap-1 px-2 py-0.5 text-xs' : 'gap-2 px-5 py-2 text-base',
      variant === 'default' && badgeColors[color],
    ]"
  >
    <FontAwesomeIcon v-if="icon" :icon="icon" />
    <span><slot /></span>
  </div>
</template>

<script setup lang="ts">
import { badgeColors, type BadgeColor } from "./MyBadge.colors";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

withDefaults(
  defineProps<{
    icon?: IconDefinition;
    color?: BadgeColor;
    size?: "sm" | "md";
    variant?: "default" | "custom";
  }>(),
  { size: "md", variant: "default", color: "teal" },
);
</script>
