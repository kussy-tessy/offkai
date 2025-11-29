<template>
  <div class="mb-4">
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
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
