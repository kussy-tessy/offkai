<template>
  <div>
    <label v-if="label" :for="fieldId" class="block text-sm font-medium mb-2">
      <span class="text-teal-800">{{ label }}</span>
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    <slot :id="fieldId" />
  </div>
</template>

<script setup lang="ts">
  import { useId } from "vue"

  const props = defineProps<{
    id?: string
    for?: string
    label?: string
    required?: boolean
  }>()

  const fieldId = props.for ?? props.id ?? useId()
</script>
