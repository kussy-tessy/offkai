<template>
  <main class="space-y-6">
    <h2 class="text-xl font-bold">参加可否の回答</h2>

    <CommitmentAnswerItem v-for="q in questions" :key="q.id" :question="q" :value="answers[q.id] ?? ''"
      :on-change="v => onChange(q.id, v)" />

    <!-- デバッグ -->
    <pre class="text-xs bg-gray-100 p-2 rounded">
{{ answers }}
    </pre>
  </main>
</template>

<script setup lang="ts">
  import type { CommitmentQuestionWithAnswer } from "@offkai/core"
  import CommitmentAnswerItem from "./CommitmentAnswerItem.vue"

  defineProps<{
    questions: CommitmentQuestionWithAnswer[]
    answers: Record<string, "yes" | "no">
    onChange: (questionId: string, value: "yes" | "no") => void
  }>()
</script>
