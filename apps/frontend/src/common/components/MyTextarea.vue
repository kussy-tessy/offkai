<template>
  <textarea v-bind="$attrs" class="w-full border border-gray-300 rounded-md px-3 py-2
           focus:outline-none focus:ring-2 focus:ring-teal-500
           resize-none" :value="unref(value)"
    @input="(e) => onChange?.((e.target as HTMLTextAreaElement).value)"></textarea>
</template>

<script setup lang="ts">
  import { MaybeRef, unref } from 'vue';

  defineProps<{
    value: MaybeRef<string>
    onChange?: (value: string) => void
  }>()
</script>