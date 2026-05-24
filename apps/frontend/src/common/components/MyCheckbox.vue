<template>
  <div>
    <label class="inline-flex items-center gap-2 text-sm text-gray-700" :class="[
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    ]">
      <input v-bind="$attrs" type="checkbox" :checked="unref(value)" :disabled="disabled"
        class="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
        @change="onChange?.(($event.target as HTMLInputElement).checked)" />
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
    error?: string
  }>()
</script>
