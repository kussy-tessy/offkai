<template>
  <label class="flex items-center gap-2 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
    <input type="radio" :name="name" :value="value" :checked="checked" :disabled="disabled"
      @change="onChange?.(value)" />
    <slot />
  </label>
</template>

<script setup lang="ts">
  defineProps<{
    name: string
    value: string
    checked: boolean
    disabled?: boolean
    onChange?: (value: string) => void
  }>()
</script>