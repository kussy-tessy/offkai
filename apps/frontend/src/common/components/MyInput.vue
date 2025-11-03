<template>
  <input
    v-bind="$attrs"
    class="w-full border border-gray-300 rounded-md px-3 py-2
           focus:outline-none focus:ring-2 focus:ring-blue-500"
    @input="(e) => onChange?.((e.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
defineProps<{
  onChange?: (value: string) => void
}>()
</script>