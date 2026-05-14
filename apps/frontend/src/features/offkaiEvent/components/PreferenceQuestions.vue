<template>
  <div class="grid gap-2">
    <PreferenceQuestionsItem v-for="(q, index) in questions" :key="q.id" :question="q" :on-update="updateQuestion"
      :on-remove="removeQuestion" :error-question="errors?.[`preferenceQuestions.${index}.question`]"
      :error-choices="errors?.[`preferenceQuestions.${index}.choices`]" />
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
  import { usePreferenceQuestions } from "../composables"
  import PreferenceQuestionsItem from "./PreferenceQuestionsItem.vue"

  const props = defineProps<{
    store: ReturnType<typeof usePreferenceQuestions>
    errors?: FieldErrors
  }>();
  const { questions, addQuestion, removeQuestion, updateQuestion } = props.store;
  const errors = toRef(props, 'errors');
</script>

<style scoped></style>
