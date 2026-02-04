<template>
  <div class="grid gap-2">
    <PreferenceQuestionsItem v-for="q in questions" :key="q.id" :question="q" :on-update="updateQuestion"
      :on-remove="removeQuestion" />
  </div>
  <div class="mt-2 flex justify-center">
    <MyButton color="secondary" variant="ghost" class="w-[50%]" @click="addQuestion">
      <FontAwesomeIcon :icon="faPlus" class="me-2" />質問を追加
    </MyButton>
  </div>
</template>

<script setup lang="ts">
  import { usePreferenceQuestions } from "../composables"
  import PreferenceQuestionsItem from "./PreferenceQuestionsItem.vue"
  import MyButton from "@/common/components/MyButton.vue";
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faPlus } from '@fortawesome/free-solid-svg-icons';
  const props = defineProps<{
    store: ReturnType<typeof usePreferenceQuestions>
  }>();
  const { questions, addQuestion, removeQuestion, updateQuestion } = props.store;
</script>

<style scoped></style>
