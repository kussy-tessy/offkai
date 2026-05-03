<template>
  <input v-bind="$attrs" :class="[
    'w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2',
    error
      ? 'border border-red-500 focus:ring-red-500'
      : 'border border-gray-300 focus:ring-teal-500'
  ]" :value="unref(value).toString()" @input="onInput" />
  <p v-if="error" class="text-sm text-red-600">
    {{ error }}
  </p>
</template>

<script setup lang="ts">
  import { MaybeRef, unref } from 'vue';

  const props = defineProps<{
    value: MaybeRef<string | number>
    onChange?: (value: string) => void
    normalizeInput?: (value: string) => string
    error?: string
  }>()

  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const normalized = props.normalizeInput
      ? props.normalizeInput(target.value)
      : target.value;

    // Keep DOM value aligned with normalized output for immediate visual feedback.
    if (normalized !== target.value) {
      target.value = normalized;
    }

    props.onChange?.(normalized);
  }
</script>