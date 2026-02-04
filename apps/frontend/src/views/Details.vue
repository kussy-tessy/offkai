<template>
  <AnswerList :data="mockOffkaiAnswerList" />
</template>

<script setup lang="ts">
  import AnswerList from '@/features/answerList/AnswerList.vue';
  import { mockOffkaiAnswerList } from '@/mocks/offkaiAnswerList';
</script>

<style scoped>
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
