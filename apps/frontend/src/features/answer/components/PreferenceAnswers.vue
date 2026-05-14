<template>
  <main class="space-y-6">
    <h2 class="text-xl font-bold">アンケート回答</h2>

    <PreferenceAnswerItem v-for="q in questions" :key="q.id" :question="q" :value="answers[q.id] ?? ''"
      :on-change="v => onChange(q.id, v)" :validation-message="validationMessages[q.id]" />

  </main>
</template>

<script setup lang="ts">
  import type { PreferenceQuestionWithAnswer, Unbrand } from "@offkai/core"
  import PreferenceAnswerItem from "./PreferenceAnswerItem.vue"

  defineProps<{
    questions: Unbrand<PreferenceQuestionWithAnswer>[]
    answers: Record<string, string>
    onChange: (questionId: string, value: string) => void
    validationMessages: Record<string, string>
  }>()
</script>
