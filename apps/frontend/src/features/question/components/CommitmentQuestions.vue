<template>
  <main>
    <div class="grid gap-2">
      <CommitmentQuestionsItem v-for="q in questions" :key="q.id" :question="q" :on-update="updateQuestion"
        :on-remove="removeQuestion" />
    </div>
    <div class="mt-2 flex justify-center">
      <MyButton class="w-[10%]" @click="addQuestion">追加</MyButton>
    </div>
  </main>
</template>

<script setup lang="ts">
  import MyButton from "@/common/components/MyButton.vue";
  import { useCommitmentQuestions } from "../composables"
  import CommitmentQuestionsItem from "./CommitmentQuestionsItem.vue"
  const props = defineProps<{
    store: ReturnType<typeof useCommitmentQuestions>
  }>()
  const { questions, addQuestion, removeQuestion, updateQuestion } = props.store
</script>

<style scoped></style>
