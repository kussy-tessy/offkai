<template>
  <div class="rounded-lg border shadow p-4" :class="validationMessage
    ? 'bg-yellow-50 border-yellow-300'
    : 'bg-slate-50 border-gray-300'">
    <!-- 質問文 -->
    <div class="font-bold text-lg">
      {{ question.question }}
      <span v-if="question.required" class="ml-2 text-xs text-red-600">必須</span>
    </div>

    <!-- 補足情報 -->
    <div class="grid grid-cols-2 gap-4 mt-3 p-3 bg-white rounded border border-gray-200 text-sm">
      <div>
        <span class="font-semibold text-gray-700">締切</span>
        <p class="text-gray-600">{{ formatWithDay(question.deadline, true) }}</p>
      </div>
      <div>
        <span class="font-semibold text-gray-700">定員</span>
        <p class="text-gray-600">{{ question.currentCount }} / {{ question.capacity }}名</p>
      </div>
    </div>

    <!-- 回答 -->
    <div class="space-y-2 mt-4">
      <MyRadioButton :name="question.id" value="yes" :checked="value === 'yes'" :disabled="!question.canSelectYes"
        :on-change="() => onChange('yes')">
        はい
      </MyRadioButton>

      <MyRadioButton :name="question.id" value="no" :checked="value === 'no'" :disabled="!question.canEdit"
        :on-change="() => onChange('no')">
        いいえ
      </MyRadioButton>
    </div>

    <!-- 無効理由 -->
    <div v-if="!question.canSelectYes" class="text-sm text-red-600 mt-3">
      <span v-if="question.disableReason === 'capacityFull'">
        定員に達しています
      </span>
      <span v-else-if="question.disableReason === 'deadlinePassed'">
        締切を過ぎています
      </span>
    </div>

    <p v-if="validationMessage" class="text-sm text-amber-700 mt-3 font-semibold">
      {{ validationMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import type { CommitmentQuestionWithAnswer, Unbrand } from "@offkai/core"
  import { formatWithDay } from "@offkai/core"
  import MyRadioButton from "@/common/components/MyRadioButton.vue"

  defineProps<{
    question: Unbrand<CommitmentQuestionWithAnswer>
    value: "yes" | "no" | "" | null
    onChange: (value: "yes" | "no") => void
    validationMessage?: string
  }>()
</script>
