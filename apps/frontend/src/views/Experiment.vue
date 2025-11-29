<template>
  <main>
    <Questions />
  </main>
</template>

<script setup lang="ts">
import Questions from '@/features/question/components/Questions.vue';
</script>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  padding: 2rem;
}
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
