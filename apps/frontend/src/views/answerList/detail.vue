<template>
  <AnswerList :data="answerListData" v-if="answerListData" />
</template>

<script setup lang="ts">
  import type { OffkaiDetail } from "@offkai/core";
  import { onMounted, ref } from 'vue';
  import { useApi } from '@/common/composables';
  import AnswerList from '@/features/answerList/components/AnswerList.vue';

  const { id } = defineProps<{
    id: string
  }>()

  const { get } = useApi();

  const answerListData = ref<OffkaiDetail | null>(null);

  onMounted(async () => {
    const data = await get<OffkaiDetail>(`/offkai-event/${id}/detail`);
    if (data) {
      answerListData.value = data;
    }
  });
</script>

<style scoped>
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
