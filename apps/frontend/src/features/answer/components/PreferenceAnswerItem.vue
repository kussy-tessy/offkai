<template>
  <div class="bg-slate-50 rounded-lg border border-gray-300 shadow p-4">
    <!-- 質問文 -->
    <div class="font-bold">
      {{ question.question }}
    </div>

    <!-- free -->
    <div v-if="question.answer.type === 'free'">
      <MyTextbox type="text" :value="value" :on-change="v => onChange(v)" />
    </div>

    <!-- choices / choicesIncludingOther -->
    <div v-else class="space-y-2">
      <MyRadioButton v-for="choice in question.answer.choices" :key="choice" :name="question.id" :value="choice"
        :checked="value === choice" :on-change="v => onChange(v)">
        {{ choice }}
      </MyRadioButton>

      <!-- その他 -->
      <div v-if="question.answer.type === 'choicesIncludingOther'" class="space-y-1">
        <MyRadioButton :name="question.id" value="__other__" :checked="isOtherSelected"
          :on-change="() => onChange(otherPrefix)">
          その他
        </MyRadioButton>

        <div v-if="isOtherSelected">
          <MyTextbox type="text" placeholder="内容を入力してください" :value="otherText"
            :on-change="v => onChange(`${otherPrefix}${v}`)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from "vue"
  import MyTextbox from "@/common/components/MyTextbox.vue"
  import MyRadioButton from "@/common/components/MyRadioButton.vue"
  import type { PreferenceQuestion } from "@/features/offkaiEvent/composables/usePreferenceQuestions"

  const props = defineProps<{
    question: PreferenceQuestion
    value: string
    onChange: (value: string) => void
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
