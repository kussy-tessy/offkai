<template>
  <button v-bind="$attrs" :class="classes" @click="onClick">
    <slot />
    <div class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent shadow" v-if="loading">
    </div>
  </button>
</template>

<script setup lang="ts">
  import { computed } from "vue"

  const props = withDefaults(defineProps<{
    onClick?: (event: MouseEvent) => void
    color?: "primary" | "secondary" | "gray" | "red"
    variant?: "solid" | "ghost"
    size?: "sm" | "md" | "lg"
    loading?: boolean
  }>(), {
    color: "primary",
    variant: "solid",
    size: "md",
    loading: false,
  });

  // 色とバリアントの組み合わせ
  const colorMap = {
    primary: {
      solid: "bg-teal-500 hover:bg-teal-600 text-white focus:ring-teal-500 shadow-lg shadow-teal-500/50",
      ghost: "border border-teal-500 text-teal-500 hover:bg-teal-50 focus:ring-teal-500",
    },
    secondary: {
      solid: "bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-500 shadow-lg shadow-teal-500/50",
      ghost: "border border-sky-500 text-sky-500 hover:bg-sky-50 focus:ring-sky-500",
    },
    gray: {
      solid: "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500 shadow-lg shadow-gray-500/50",
      ghost: "border border-gray-400 text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
    },
    red: {
      solid: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-lg shadow-red-500/50",
      ghost: "border border-red-500 text-red-500 hover:bg-red-50 focus:ring-red-500",
    },
  } as const

  // サイズごとのクラス
  const sizeMap = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-5 py-3",
  } as const

  const classes = computed(() => {
    return [
      "font-medium rounded-md transition-colors duration-150",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      colorMap[props.color][props.variant],
      sizeMap[props.size],
    ]
  })
</script>
