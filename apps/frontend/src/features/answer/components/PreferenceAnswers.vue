<template>
  <main class="space-y-6">
    <h2 class="text-xl font-bold">アンケート回答</h2>

    <PreferenceAnswerItem v-for="q in questions" :key="q.id" :question="q" :value="answers[q.id] ?? ''"
      :on-change="v => onChange(q.id, v)" />

    <!-- デバッグ用 -->
    <pre class="text-xs bg-gray-100 p-2 rounded">
{{ answers }}
    </pre>
  </main>
</template>

<script setup lang="ts">
  import type { PreferenceQuestionWithAnswer } from "@offkai/core"
  import PreferenceAnswerItem from "./PreferenceAnswerItem.vue"

  defineProps<{
    questions: PreferenceQuestionWithAnswer[]
    answers: Record<string, string>
    onChange: (questionId: string, value: string) => void
  }>()
</script>
