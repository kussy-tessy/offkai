<template>
  <textarea v-bind="$attrs" :class="[
    'w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 resize-none',
    error
      ? 'border border-red-500 focus:ring-red-500'
      : 'border border-gray-300 focus:ring-teal-500'
  ]" :value="unref(value)" @input="(e) => onChange?.((e.target as HTMLTextAreaElement).value)"></textarea>
  <p v-if="error" class="text-sm text-red-600">
    {{ error }}
  </p>
</template>

<script setup lang="ts">
  import { MaybeRef, unref } from 'vue';

  defineProps<{
    value: MaybeRef<string>
    onChange?: (value: string) => void
    error?: string
  }>()
</script>