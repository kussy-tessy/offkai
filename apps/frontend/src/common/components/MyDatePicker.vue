<template>
  <VueDatePicker :model-value="innerDate" @update:model-value="onUpdate" :formats="formats" :locale="ja"
    :time-config="{ enableTimePicker: includesTime, timePickerInline: includesTime }" />
  <p v-if="error" class="text-sm text-red-600">
    {{ error }}
  </p>
</template>

<script setup lang="ts">
  import { computed, unref, type MaybeRef } from "vue"
  import { VueDatePicker } from "@vuepic/vue-datepicker"
  import "@vuepic/vue-datepicker/dist/main.css"
  import { ja } from "date-fns/locale"

  const props = defineProps<{
    value: MaybeRef<string>
    onChange: (value: string) => void
    includesTime?: boolean
    error?: string
  }>()

  const includesTime = computed(() => props.includesTime ?? false)

  /**
   * 表示フォーマット
   */
  const formats = computed(() => {
    return includesTime.value
      ? { input: "yyyy/MM/dd HH:mm", preview: "" }
      : { input: "yyyy/MM/dd", preview: "" }
  })

  /**
   * 外部(string) → 内部(Date | null)
   */
  const innerDate = computed<Date | null>(() => {
    const value = unref(props.value)
    if (!value) return null

    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  })

  /**
   * 内部(Date | null) → 外部(string)
   */
  const onUpdate = (date: Date | null) => {
    if (!date) {
      props.onChange("")
      return
    }

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")

    if (!includesTime.value) {
      props.onChange(`${yyyy}-${mm}-${dd}`)
      return
    }

    const hh = String(date.getHours()).padStart(2, "0")
    const mi = String(date.getMinutes()).padStart(2, "0")

    props.onChange(`${yyyy}-${mm}-${dd} ${hh}:${mi}`)
  }
</script>
