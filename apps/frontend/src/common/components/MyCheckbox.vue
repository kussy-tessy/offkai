<template>
  <div>
    <label
      class="inline-flex items-center gap-2 text-sm text-gray-700"
      :class="disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
    >
      <span class="relative h-4 w-4 shrink-0">
        <input
          v-bind="$attrs"
          type="checkbox"
          :checked="unref(value)"
          :disabled="disabled || loading"
          :aria-busy="loading"
          class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
          :class="{ invisible: loading }"
          @change="onChange?.(($event.target as HTMLInputElement).checked)"
        />
        <span
          v-if="loading"
          class="absolute inset-0 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600"
          role="status"
          aria-label="更新中"
        />
      </span>
      <span v-if="$slots.default">
        <slot />
      </span>
    </label>
    <p v-if="error" class="text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import { MaybeRef, unref } from "vue"

  defineOptions({
    inheritAttrs: false,
  })

  defineProps<{
    value: MaybeRef<boolean>
    onChange?: (value: boolean) => void
    disabled?: boolean
    loading?: boolean
    error?: string
  }>()
</script>
