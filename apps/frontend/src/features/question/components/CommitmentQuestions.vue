<template>
  <main>
    <h2>Commitment Questions</h2>

    <CommitmentQuestionsItem
      v-for="q in questions"
      :key="q.id"
      :question="q"
      :on-update="updateQuestion"
      :on-remove="removeQuestion"
    />

    <div class="actions">
      <button @click="addQuestion">質問を追加</button>
    </div>

    <pre>{{ questions }}</pre>
  </main>
</template>

<script setup lang="ts">
import { useCommitmentQuestions } from "../composables"
import CommitmentQuestionsItem from "./CommitmentQuestionsItem.vue"

const { questions, addQuestion, removeQuestion, updateQuestion } = useCommitmentQuestions()
</script>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  padding: 2rem;
}

.actions {
  margin-top: 1rem;
}

button {
  padding: 0.4rem 0.8rem;
  border: none;
  background-color: #1976d2;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #1565c0;
}
</style>
