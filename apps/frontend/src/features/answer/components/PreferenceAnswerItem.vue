<template>
  <div class="rounded-lg border shadow p-4" :class="validationMessage
    ? 'bg-yellow-50 border-yellow-300'
    : 'bg-slate-50 border-gray-300'">
    <!-- 質問文 -->
    <div class="font-bold">
      {{ question.question }}
      <span v-if="question.required" class="ml-2 text-xs text-red-600">必須</span>
    </div>

    <!-- free -->
    <div v-if="question.answerTemplate.type === 'free'">
      <MyTextbox type="text" :value="value" :on-change="v => onChange(v)" />
    </div>

    <!-- choices / choicesIncludingOther -->
    <div v-else class="space-y-2">
      <MyRadioButton v-for="choice in question.answerTemplate.choices" :key="choice" :name="question.id" :value="choice"
        :checked="value === choice" :on-change="v => onChange(v)">
        {{ choice }}
      </MyRadioButton>

      <!-- その他 -->
      <div v-if="question.answerTemplate.type === 'choicesIncludingOther'" class="space-y-1">
        <MyRadioButton :name="question.id" value="__other__" :checked="isOtherSelected"
          :on-change="() => onChange(otherPrefix)">
          その他
        </MyRadioButton>

        <div v-if="isOtherSelected">
          <MyTextbox type="text" placeholder="内容を入力してください" :value="otherText"
            :on-change="v => onChange(`${otherPrefix}${v}`)" />
        </div>
      </div>

      <MyRadioButton v-if="allowEmpty" :name="question.id" value="" :checked="value === ''"
        :on-change="() => onChange('')">
        未回答
      </MyRadioButton>
    </div>

    <p v-if="validationMessage" class="text-sm text-amber-700 mt-3 font-semibold">
      {{ validationMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import type { PreferenceQuestionWithAnswer, Unbrand } from "@offkai/core"
  import { computed } from "vue"
  import MyRadioButton from "@/common/components/MyRadioButton.vue"
  import MyTextbox from "@/common/components/MyTextbox.vue"

  const props = defineProps<{
    question: Unbrand<PreferenceQuestionWithAnswer>
    value: string
    onChange: (value: string) => void
    validationMessage?: string
    allowEmpty?: boolean
  }>()

  const otherPrefix = "その他: "

  const isOtherSelected = computed(() =>
    props.value.startsWith(otherPrefix)
  )

  const otherText = computed(() =>
    isOtherSelected.value
      ? props.value.slice(otherPrefix.length)
      : ""
  )
</script>
