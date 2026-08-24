<template>
  <VueDatePicker v-bind="$attrs" :model-value="innerDate" @update:model-value="onUpdate" :formats="formats" :locale="ja"
    :auto-apply="!includesTime" :action-row="{ showPreview: false }"
    :time-config="{ enableTimePicker: includesTime, timePickerInline: includesTime, startTime: initialTime }" />
  <p v-if="error" class="text-sm text-red-600">
    {{ error }}
  </p>
</template>

<script setup lang="ts">
  import { VueDatePicker } from "@vuepic/vue-datepicker"
  import { computed, type MaybeRef, unref } from "vue"
  import "@vuepic/vue-datepicker/dist/main.css"
  import { ja } from "date-fns/locale"

  defineOptions({
    inheritAttrs: false,
  })

  const props = defineProps<{
    value: MaybeRef<string>
    onChange: (value: string) => void
    includesTime?: boolean
    initialTime?: { hours: number; minutes: number }
    error?: string
  }>()

  const includesTime = computed(() => props.includesTime ?? false)
  const initialTime = computed(() => props.initialTime)

  /**
   * 表示フォーマット
   */
  const formats = computed(() => {
    return includesTime.value
      ? { input: "yyyy/MM/dd HH:mm" }
      : { input: "yyyy/MM/dd" }
  })

  /**
   * 外部(string) → 内部(Date | null)
   */
  const innerDate = computed<Date | null>(() => {
    const value = unref(props.value)
    if (!value) return null

    // API form values are JST wall-clock strings without an offset. Build the
    // Date from its parts so the browser does not reinterpret it as an instant.
    const localDateTime = value.match(
      /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2}))?$/,
    )
    if (localDateTime) {
      const [, year, month, day, hours = "0", minutes = "0"] = localDateTime
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
      )
    }

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
