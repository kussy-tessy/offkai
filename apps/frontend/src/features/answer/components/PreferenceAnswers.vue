<template>
  <main class="space-y-6">
    <h2 class="text-xl font-bold">アンケート回答</h2>

    <PreferenceAnswerItem v-for="q in questions" :key="q.id" :question="q" :value="answers[q.id] ?? ''"
      :on-change="v => updateAnswer(q.id, v)" />

    <div class="pt-4">
      <MyButton color="primary" @click="submit">
        送信
      </MyButton>
    </div>

    <!-- デバッグ用 -->
    <pre class="text-xs bg-gray-100 p-2 rounded">
{{ answers }}
    </pre>
  </main>
</template>

<script setup lang="ts">
  import { ref } from "vue"
  import PreferenceAnswerItem from "./PreferenceAnswerItem.vue"
  import MyButton from "@/common/components/MyButton.vue"
  import type { PreferenceQuestion } from "@/features/offkaiEvent/composables/usePreferenceQuestions"

  defineProps<{
    questions: PreferenceQuestion[]
  }>()

  const answers = ref<Record<string, string>>({})

  const updateAnswer = (questionId: string, value: string) => {
    answers.value[questionId] = value
  }

  const submit = () => {
    console.log("answers:", answers.value)
  }
</script>
