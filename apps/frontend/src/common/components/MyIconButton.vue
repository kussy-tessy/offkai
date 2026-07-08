<template>
  <MyButton
    v-bind="$attrs"
    type="button"
    :aria-label="label"
    :color="color"
    :variant="variant"
    :size="size"
    :loading="loading"
    :disabled="disabled || loading"
    :on-click="onClick"
    class="!p-0"
    :class="dimensions"
  >
    <slot />
  </MyButton>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import MyButton from "./MyButton.vue";

  defineOptions({
    inheritAttrs: false,
  });

  const props = withDefaults(defineProps<{
    label: string;
    onClick?: (event: MouseEvent) => void;
    color?: "primary" | "secondary" | "gray" | "red";
    variant?: "solid" | "ghost";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    disabled?: boolean;
  }>(), {
    onClick: undefined,
    color: "gray",
    variant: "ghost",
    size: "md",
    loading: false,
    disabled: false,
  });

  const dimensions = computed(() => ({
    "h-8 w-8": props.size === "sm",
    "h-9 w-9": props.size === "md",
    "h-10 w-10": props.size === "lg",
    "!border-0": props.variant === "ghost",
  }));
</script>
