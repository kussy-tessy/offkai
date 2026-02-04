<template>
  <OffkaiEvent :initial-value="initialValue" :handle-submit="create" />
</template>

<script setup lang="ts">
  import { useApi } from '@/common/composables';
  import OffkaiEvent from '@/features/offkaiEvent/components/OffkaiEvent.vue';

  const { get, post, loading } = useApi();

  const initialValue = {
    title: "aa",
    eventDate: "2026/02/13",
    applicationStartDate: "2026/02/10",
    description: "aaa",
    commitmentQuestions: [],
    preferenceQuestions: [],
  }

  const create = async (payload: unknown) => {
    await post("/offkai-event", payload)
  }
</script>

<style scoped></style>