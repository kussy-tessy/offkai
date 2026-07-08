<template>
  <MyCheckbox
    v-bind="$attrs"
    :value="value"
    :disabled="disabled || pending"
    :loading="pending"
    :error="error"
    :on-change="handleChange"
  >
    <slot />
  </MyCheckbox>
</template>

<script setup lang="ts">
  import { type MaybeRef, ref } from "vue"
  import MyCheckbox from "./MyCheckbox.vue"

  defineOptions({
    inheritAttrs: false,
  })

  const props = defineProps<{
    value: MaybeRef<boolean>
    save: (value: boolean) => Promise<unknown>
    disabled?: boolean
    error?: string
  }>()

  const emit = defineEmits<{
    change: [value: boolean]
    error: [cause: unknown]
  }>()

  const pending = ref(false)

  const handleChange = async (value: boolean) => {
    if (pending.value || props.disabled) return

    pending.value = true
    try {
      await props.save(value)
      emit("change", value)
    } catch (cause) {
      emit("error", cause)
    } finally {
      pending.value = false
    }
  }
</script>
