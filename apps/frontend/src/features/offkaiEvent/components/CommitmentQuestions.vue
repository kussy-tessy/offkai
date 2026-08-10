<template>
  <div class="grid gap-2">
    <CommitmentQuestionsItem v-for="(q, index) in questions" :key="q.id" :question="q" :on-update="updateQuestion"
      :on-remove="removeQuestion" :error-question="errors?.[`commitmentQuestions.${index}.question`]"
      :error-question-short="errors?.[`commitmentQuestions.${index}.questionShort`]"
      :error-description="errors?.[`commitmentQuestions.${index}.description`]"
      :error-deadline="errors?.[`commitmentQuestions.${index}.deadline`]"
      :error-capacity="errors?.[`commitmentQuestions.${index}.capacity`]" :on-move="moveQuestion"
      :can-move-up="index > 0" :can-move-down="index < questions.length - 1" />
  </div>
  <div class="mt-2 flex justify-center">
    <MyButton color="secondary" variant="ghost" class="w-[50%]" @click="addQuestion">
      <FontAwesomeIcon :icon="faPlus" class="me-2" />質問を追加
    </MyButton>
  </div>
</template>

<script setup lang="ts">
  import { faPlus } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { toRef } from 'vue';
  import MyButton from "@/common/components/MyButton.vue";
  import type { FieldErrors } from "@/common/composables";
  import { useCommitmentQuestions } from "../composables"
  import CommitmentQuestionsItem from "./CommitmentQuestionsItem.vue"

  const props = defineProps<{
    store: ReturnType<typeof useCommitmentQuestions>
    errors?: FieldErrors
  }>()
  const { questions, addQuestion, removeQuestion, updateQuestion, moveQuestion } = props.store
  const errors = toRef(props, 'errors')
</script>

<style scoped></style>
