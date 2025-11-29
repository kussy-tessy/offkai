<template>
  <main>
    <h2 class="lg">Preference Questions</h2>
    <PreferenceQuestionsItem v-for="q in questions" :key="q.id" :question="q" :on-update="updateQuestion"
      :on-remove="removeQuestion" />
    <div class="actions">
      <MyButton @click="addQuestion">質問を追加</MyButton>
    </div>
  </main>
</template>

<script setup lang="ts">
  import { usePreferenceQuestions } from "../composables"
  import PreferenceQuestionsItem from "./PreferenceQuestionsItem.vue"
  import MyButton from "@/common/components/MyButton.vue";
  const props = defineProps<{
    store: ReturnType<typeof usePreferenceQuestions>
  }>();
  const { questions, addQuestion, removeQuestion, updateQuestion } = props.store;
</script>

<style scoped></style>
