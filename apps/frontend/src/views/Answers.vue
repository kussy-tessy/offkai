<template>
  <CommitmentAnswers :questions="mockPreferenceQuestions" />
  <PreferenceAnswers :questions="mockPreferenceQuestions" />
</template>

<script setup lang="ts">
  import CommitmentAnswers from '@/features/answer/components/CommitmentAnswers.vue';
  import PreferenceAnswers from '@/features/answer/components/PreferenceAnswers.vue';
  import { mockPreferenceQuestions } from '@/mocks/preferenceQuestions';
</script>

<style scoped>
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
