<template>
  <main class="space-y-6">
    <h2 class="text-xl font-bold">参加可否の回答</h2>

    <CommitmentAnswerItem v-for="q in questions" :key="q.id" :question="q" :value="answers[q.id] ?? ''"
      :on-change="v => updateAnswer(q.id, v)" />

    <div class="pt-4">
      <MyButton color="primary" @click="submit">
        送信
      </MyButton>
    </div>

    <!-- デバッグ -->
    <pre class="text-xs bg-gray-100 p-2 rounded">
{{ answers }}
    </pre>
  </main>
</template>

<script setup lang="ts">
  import { ref } from "vue"
  import CommitmentAnswerItem from "./CommitmentAnswerItem.vue"
  import MyButton from "@/common/components/MyButton.vue"
  import { mockCommitmentQuestions } from "@/mocks/commitmentQuestions"

  const questions = mockCommitmentQuestions

  const answers = ref<Record<string, "yes" | "no">>({})

  const updateAnswer = (questionId: string, value: "yes" | "no") => {
    answers.value[questionId] = value
  }

  const submit = () => {
    console.log("commitment answers:", answers.value)
  }
</script>
