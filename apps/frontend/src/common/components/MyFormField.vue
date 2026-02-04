<template>
  <div class="mb-4">
    <label v-if="label" class="block text-sm font-medium mb-2">
      <span class="text-teal-800">{{ label }}</span>
      <span v-if="required" class="text-red-500 ml-1">*</span>
      <slot />
    </label>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    label?: string
    required?: boolean
  }>()
</script>
