<template>
  <div v-if="initialLoading" class="py-8 text-center text-sm text-gray-400">
    テンプレートを読み込み中…
  </div>
  <OffkaiEvent v-else :initial-value="initialValue" :handle-submit="create" />
</template>

<script setup lang="ts">
  import type { GetSeriesQuestionTemplateResponse } from "@offkai/core";
  import { onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
  import OffkaiEvent from "@/features/offkaiEvent/components/OffkaiEvent.vue";
  import type { OffkaiEventInitializeProps } from "@/features/offkaiEvent/composables";

  const { get, post } = useApi();
  const { success, error } = useToast();
  const router = useRouter();
  const initialLoading = ref(true);

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
    commitmentQuestions: [],
    preferenceQuestions: [],
  });

  onMounted(async () => {
    try {
      const template = await get<GetSeriesQuestionTemplateResponse>("/series/my/question-template");
      if (template) {
        initialValue.value = {
          ...initialValue.value,
          preferenceQuestions: template.preferenceQuestions,
        };
      }
    } catch (cause) {
      error(getApiErrorMessage(cause, "アンケートテンプレートの読み込みに失敗しました。空の状態で作成できます。"));
    } finally {
      initialLoading.value = false;
    }
  });

  const create = async (payload: unknown) => {
    try {
      const result = await post<{ id: string }>("/offkai-event", payload);
      if (!result) return;
      success("オフ会を作成しました。");
      await router.push(`/offkai/${result.id}/detail`);
    } catch (cause) {
      error(getApiErrorMessage(cause, "オフ会の作成に失敗しました。"));
    }
  };
</script>
