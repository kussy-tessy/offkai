<template>
  <OffkaiEvent :initial-value="initialValue" :handle-submit="update" :is-edit="true" />

</template>

<script setup lang="ts">
  import { CreateOffkaiEventRequest, OffkaiEventResponse } from "@offkai/core";
  import { onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { getApiErrorMessage, useApi, useToast } from '@/common/composables';
  import OffkaiEvent from '@/features/offkaiEvent/components/OffkaiEvent.vue';
  import { CommitmentQuestion, OffkaiEventInitializeProps, PreferenceQuestion } from '@/features/offkaiEvent/composables';

  const { id } = defineProps<{
    id: string
  }>()

  const { get, put } = useApi();
  const { success, error } = useToast();
  const router = useRouter();

  const initialValue = ref<OffkaiEventInitializeProps>({
    title: "",
    eventPeriod: {
      startDate: "",
      endDate: "",
    },
    applicationStartDate: "",
    description: "",
    discordRoleId: null,
    askBringingKigurumi: false,
		overviewVisibility: "AUTHENTICATED",
		participantsVisibility: "AUTHENTICATED",
    commitmentQuestions: [] as CommitmentQuestion[],
    preferenceQuestions: [] as PreferenceQuestion[],
  })

  onMounted(async () => {
    try {
      const data = await get<OffkaiEventResponse>(`/offkai-event/${id}`);
      if (data) {
        initialValue.value = data;
      }
    } catch (cause) {
      error(getApiErrorMessage(cause, "オフ会の読み込みに失敗しました。"));
    }
  });

  const update = async (payload: unknown) => {
    try {
      await put(`/offkai-event/${id}`, payload as CreateOffkaiEventRequest)
      success("オフ会を更新しました。")
      await router.push(`/offkai/${id}/detail`)
    } catch (cause) {
      error(getApiErrorMessage(cause, "オフ会の更新に失敗しました。"))
    }
  }
</script>
