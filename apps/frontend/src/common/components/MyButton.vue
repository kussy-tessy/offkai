<template>
  <button
    v-bind="$attrs"
    :class="classes"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  onClick?: (event: MouseEvent) => void
  color?: "blue" | "gray" | "red" | "green"
  variant?: "solid" | "ghost"
  size?: "sm" | "md" | "lg"
}>()

// 色とバリアントの組み合わせ
const colorMap = {
  blue: {
    solid: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500",
    ghost: "border border-blue-500 text-blue-500 hover:bg-blue-50 focus:ring-blue-500",
  },
  gray: {
    solid: "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500",
    ghost: "border border-gray-400 text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
  },
  red: {
    solid: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
    ghost: "border border-red-500 text-red-500 hover:bg-red-50 focus:ring-red-500",
  },
  green: {
    solid: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500",
    ghost: "border border-green-500 text-green-600 hover:bg-green-50 focus:ring-green-500",
  },
} as const

// サイズごとのクラス
const sizeMap = {
  sm: "text-sm px-3 py-1.5",
  md: "text-base px-4 py-2",
  lg: "text-lg px-5 py-3",
} as const

const classes = computed(() => {
  const color = props.color ?? "blue"
  const variant = props.variant ?? "solid"
  const size = props.size ?? "md"
  return [
    "w-full font-medium rounded-md transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    colorMap[color][variant],
    sizeMap[size],
  ]
})
</script>
