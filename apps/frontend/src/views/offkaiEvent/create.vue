<template>
  <OffkaiEvent :initial-value="initialValue" :handle-submit="create" />
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router';
  import { useApi, useToast } from '@/common/composables';
  import OffkaiEvent from '@/features/offkaiEvent/components/OffkaiEvent.vue';

  const { post } = useApi();
  const { success, error } = useToast();
  const router = useRouter();

  const initialValue = {
    title: "aa",
    eventDate: "2026/02/13",
    applicationStartDate: "2026/02/10",
    description: "aaa",
    commitmentQuestions: [],
    preferenceQuestions: [],
  }

  const create = async (payload: unknown) => {
    try {
      await post("/offkai-event", payload)
      success("オフ会を作成しました。")
      await router.push('/dashboard')
    } catch {
      error("オフ会の作成に失敗しました。")
    }
  }
</script>

<style scoped></style>