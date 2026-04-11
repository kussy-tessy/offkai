<template>
  <form class="space-y-10" @submit.prevent="submit">
    <CommitmentAnswers :questions="mockCommitmentQuestionsWithAnswer" :answers="commitmentAnswers"
      :on-change="updateCommitmentAnswer" />
    <PreferenceAnswers :questions="mockPreferenceQuestionsWithAnswer" :answers="preferenceAnswers"
      :on-change="updatePreferenceAnswer" />

    <div class="pt-4">
      <MyButton color="primary" type="submit">
        送信
      </MyButton>
    </div>
  </form>
</template>

<script setup lang="ts">
  import MyButton from '@/common/components/MyButton.vue';
  import CommitmentAnswers from '@/features/answer/components/CommitmentAnswers.vue';
  import PreferenceAnswers from '@/features/answer/components/PreferenceAnswers.vue';
  import { useCommitmentAnswers, usePreferenceAnswers } from '@/features/answer/composables';
  import { mockCommitmentQuestionsWithAnswer } from '@/mocks/commitmentQuestionsWithAnswer';
  import { mockPreferenceQuestionsWithAnswer } from '@/mocks/preferenceQuestionsWithAnswer';

  const { answers: commitmentAnswers, updateAnswer: updateCommitmentAnswer } = useCommitmentAnswers(
    mockCommitmentQuestionsWithAnswer,
  );
  const { answers: preferenceAnswers, updateAnswer: updatePreferenceAnswer } = usePreferenceAnswers(
    mockPreferenceQuestionsWithAnswer,
  );

  const submit = () => {
    console.log("commitment answers:", commitmentAnswers.value)
    console.log("preference answers:", preferenceAnswers.value)
  }
</script>

<style scoped>
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
