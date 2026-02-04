<template>
  <OffkaiEvent :initial-value="initialValue" :handle-submit="update" />

</template>

<script setup lang="ts">
  import { useApi } from '@/common/composables';
  import OffkaiEvent from '@/features/offkaiEvent/components/OffkaiEvent.vue';
  import { CommitmentQuestion, PreferenceQuestion } from '@/features/offkaiEvent/composables';
  import { onMounted, ref } from 'vue';
  import { CreateOffkaiEventRequest, OffkaiEventResponse } from "@offkai/core";

  const { id } = defineProps<{
    id: string
  }>()

  const { get, post } = useApi();

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
    await post("/offkai-event", payload as CreateOffkaiEventRequest)
  }
</script>