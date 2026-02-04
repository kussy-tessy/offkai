<template>
  <div class="bg-slate-50 rounded-lg border border-gray-300 shadow p-4">
    <!-- 質問文 -->
    <div class="font-bold">
      {{ question.question }}
    </div>

    <!-- 補足情報 -->
    <div class="text-sm text-gray-600">
      締切：{{ question.deadline }} /
      定員：{{ question.currentCount }} / {{ question.capacity }}
    </div>

    <!-- 回答 -->
    <div class="space-y-2">
      <MyRadioButton :name="question.id" value="yes" :checked="value === 'yes'" :disabled="!question.canSelectYes"
        :on-change="() => onChange('yes')">
        はい
      </MyRadioButton>

      <MyRadioButton :name="question.id" value="no" :checked="value === 'no'" :on-change="() => onChange('no')">
        いいえ
      </MyRadioButton>
    </div>

    <!-- 無効理由 -->
    <div v-if="!question.canSelectYes" class="text-sm text-red-600">
      <span v-if="question.disableReason === 'capacityFull'">
        定員に達しています
      </span>
      <span v-else-if="question.disableReason === 'deadlinePassed'">
        締切を過ぎています
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import MyRadioButton from "@/common/components/MyRadioButton.vue"
  import type { CommitmentQuestionForAnswer } from "@/mocks/commitmentQuestions"

  defineProps<{
    question: CommitmentQuestionForAnswer
    value: "yes" | "no" | ""
    onChange: (value: "yes" | "no") => void
  }>()
</script>
