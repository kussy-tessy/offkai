<template>
  <div class="rounded-lg border shadow p-4" :class="validationMessage
    ? 'bg-yellow-50 border-yellow-300'
    : 'bg-slate-50 border-gray-300'">
    <!-- 質問文 -->
    <div class="font-bold text-lg">
      {{ question.question }}
      <span v-if="question.required" class="ml-2 text-xs text-red-600">必須</span>
    </div>

    <p v-if="question.description" class="mt-2 text-sm text-gray-600 whitespace-pre-line">
      {{ question.description }}
    </p>

    <!-- 補足情報 -->
    <div class="grid grid-cols-2 gap-4 mt-3 p-3 bg-white rounded border border-gray-200 text-sm">
      <div>
        <span class="font-semibold text-gray-700">締切</span>
        <p class="text-gray-600">{{ formatWithDay(question.deadline, true) }}</p>
      </div>
      <div>
        <span class="font-semibold text-gray-700">定員</span>
        <p class="text-gray-600">{{ question.currentCount + (value === "yes" ? 1 : 0) }} / {{ question.capacity }}名</p>
      </div>
    </div>

    <!-- 回答 -->
    <div class="space-y-2 mt-4">
      <MyRadioButton :name="question.id" value="yes" :checked="value === 'yes'"
        :disabled="!question.canEdit || !question.canSelectYes" :on-change="() => onChange('yes')">
        はい
      </MyRadioButton>

      <MyRadioButton :name="question.id" value="no" :checked="value === 'no'" :disabled="!question.canEdit"
        :on-change="() => onChange('no')">
        いいえ
      </MyRadioButton>

      <MyRadioButton v-if="allowEmpty" :name="question.id" value="" :checked="value === null || value === ''"
        :disabled="!question.canEdit" :on-change="() => onChange(null)">
        未回答
      </MyRadioButton>
    </div>

    <!-- 無効理由 -->
    <div v-if="question.disableReason" class="text-sm text-red-600 mt-3">
      <span v-if="question.disableReason === 'capacityFull'">
        定員に達しているため回答対象外です
      </span>
      <span v-else-if="question.disableReason === 'deadlinePassed'">
        締切を過ぎているため回答対象外です
      </span>
      <span v-else-if="question.disableReason === 'applicationNotStarted'">
        現在は募集期間外のため、参加可否を変更できません
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
    onChange: (value: "yes" | "no" | null) => void
    validationMessage?: string
    allowEmpty?: boolean
  }>()
</script>
