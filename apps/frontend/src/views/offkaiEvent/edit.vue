<template>
  <OffkaiEvent :initial-value="initialValue" :handle-submit="update" :is-edit="true" />

</template>

<script setup lang="ts">
  import { CreateOffkaiEventRequest, OffkaiEventResponse } from "@offkai/core";
  import { onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useApi, useToast } from '@/common/composables';
  import OffkaiEvent from '@/features/offkaiEvent/components/OffkaiEvent.vue';
  import { CommitmentQuestion, PreferenceQuestion } from '@/features/offkaiEvent/composables';

  const { id } = defineProps<{
    id: string
  }>()

  const { get, put } = useApi();
  const { success, error } = useToast();
  const router = useRouter();

  const initialValue = ref({
    title: "",
    eventDate: "",
    applicationStartDate: "",
    description: "",
    commitmentQuestions: [] as CommitmentQuestion[],
    preferenceQuestions: [] as PreferenceQuestion[],
  })

  onMounted(async () => {
    const data = await get<OffkaiEventResponse>(`/offkai-event/${id}`);
    if (data) {
      initialValue.value = data;
    }
  });

  const update = async (payload: unknown) => {
    try {
      await put(`/offkai-event/${id}`, payload as CreateOffkaiEventRequest)
      success("オフ会を更新しました。")
      await router.push(`/offkai/${id}/detail`)
    } catch {
      error("オフ会の更新に失敗しました。")
    }
  }
</script>