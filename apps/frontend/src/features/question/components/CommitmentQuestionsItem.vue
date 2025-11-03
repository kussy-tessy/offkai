<template>
  <div class="question">
    <MyInput
      type="text"
      :value="question.question"
      placeholder="質問内容"
      :on-change="v=>onUpdate(question.id, { question: v })"
    />
    <MyInput
      type="date"
      :value="question.deadline"
      :on-change="v=>onUpdate(question.id, { deadline: v })"
    />
    <MyInput
      type="text"
      inputmode="numeric"
      :value="question.capacity"
      placeholder="定員"
      :on-change="v =>onUpdate(question.id, { capacity: Number(v) })"
    />
    <button @click="onRemove(question.id)">削除</button>
  </div>
</template>

<script setup lang="ts">
import MyInput from "@/common/components/MyInput.vue";
import type { CommitmentQuestion } from "../composables"

defineProps<{
  question: CommitmentQuestion
  onUpdate: (id: string, patch: Partial<CommitmentQuestion>) => void
  onRemove: (id: string) => void
}>()
</script>

<style scoped>
.question {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

input {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 0.4rem 0.8rem;
  border: none;
  background-color: #d32f2f;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #c62828;
}
</style>
