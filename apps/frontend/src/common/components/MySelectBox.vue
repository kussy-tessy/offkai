<template>
  <select
    v-bind="$attrs"
    :class="[
      'w-full rounded-md bg-white px-3 py-2 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
      error
        ? 'border border-red-500 focus:ring-red-500'
        : 'border border-gray-300 focus:ring-teal-500',
    ]"
    :value="selectedValue"
    :disabled="disabled"
    @change="onSelect"
  >
    <option v-if="placeholder" value="" :disabled="placeholderDisabled">
      {{ placeholder }}
    </option>
    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
    <slot />
  </select>
  <p v-if="error" class="text-sm text-red-600">
    {{ error }}
  </p>
</template>

<script setup lang="ts">
  import { computed, type MaybeRef, unref } from "vue"

  defineOptions({
    inheritAttrs: false,
  })

  export type SelectOption = {
    value: string | number
    label: string
    disabled?: boolean
  }

  const props = withDefaults(
    defineProps<{
      value?: MaybeRef<string | number>
      modelValue?: string | number
      options?: SelectOption[]
      placeholder?: string
      placeholderDisabled?: boolean
      onChange?: (value: string | number) => void
      disabled?: boolean
      error?: string
    }>(),
    {
      options: () => [],
      placeholderDisabled: true,
    },
  )

  const emit = defineEmits<{
    "update:modelValue": [value: string | number]
    change: [value: string | number]
  }>()

  const selectedValue = computed(() =>
    props.modelValue ?? (props.value === undefined ? "" : unref(props.value)),
  )

  const onSelect = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value
    const option = props.options.find((option) => String(option.value) === value)
    const nextValue = option?.value ?? value

    props.onChange?.(nextValue)
    emit("update:modelValue", nextValue)
    emit("change", nextValue)
  }
</script>
