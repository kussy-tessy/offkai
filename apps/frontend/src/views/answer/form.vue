<template>
  <div class="space-y-4">
    <p v-if="loading" class="status">回答フォームを読み込み中です...</p>
    <p v-else-if="errorMessage" class="status status-error">{{ errorMessage }}</p>

    <form v-if="formData" class="space-y-10" @submit.prevent="submit">
      <CommitmentAnswers :questions="formData.commitmentQuestions" :answers="commitmentAnswers"
        :on-change="updateCommitmentAnswer" />
      <PreferenceAnswers :questions="formData.preferenceQuestions" :answers="preferenceAnswers"
        :on-change="updatePreferenceAnswer" />

      <div class="pt-4">
        <MyButton color="primary" type="submit" :disabled="submitting">
          {{ submitting ? "送信中..." : "送信" }}
        </MyButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
  import type {
    GetMyAnswerFormResponse,
    SaveOffkaiAnswerRequest,
    Unbrand,
  } from "@offkai/core";
  import { onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import { useApi, useToast } from "@/common/composables";
  import CommitmentAnswers from "@/features/answer/components/CommitmentAnswers.vue";
  import PreferenceAnswers from "@/features/answer/components/PreferenceAnswers.vue";
  import {
    useCommitmentAnswers,
    usePreferenceAnswers,
  } from "@/features/answer/composables";

  const props = defineProps<{
    id: string;
  }>();

  const { get, put, loading } = useApi();
  const { success, error } = useToast();
  const router = useRouter();
  const errorMessage = ref<string | null>(null);
  const submitting = ref(false);

  const formData = ref<Unbrand<GetMyAnswerFormResponse> | null>(null);

  const { answers: commitmentAnswers, updateAnswer: updateCommitmentAnswer } =
    useCommitmentAnswers([]);
  const { answers: preferenceAnswers, updateAnswer: updatePreferenceAnswer } =
    usePreferenceAnswers([]);

  function hydrateAnswers(data: Unbrand<GetMyAnswerFormResponse>) {
    commitmentAnswers.value = {};
    for (const question of data.commitmentQuestions) {
      if (question.userAnswer !== null) {
        commitmentAnswers.value[question.id] = question.userAnswer;
      }
    }

    preferenceAnswers.value = {};
    for (const question of data.preferenceQuestions) {
      if (question.userAnswer !== null) {
        preferenceAnswers.value[question.id] = question.userAnswer;
      }
    }
  }

  onMounted(async () => {
    errorMessage.value = null;
    if (!props.id) {
      errorMessage.value = "イベントIDが不正です。";
      return;
    }

    try {
      const data = await get<Unbrand<GetMyAnswerFormResponse>>(
        `/offkai-event/${props.id}/my-answer-form`,
      );
      if (!data) {
        errorMessage.value = "回答フォームの取得に失敗しました。";
        return;
      }
      formData.value = data;
      hydrateAnswers(data);
    } catch {
      errorMessage.value = "回答フォームの取得に失敗しました。";
    }
  });

  const submit = async () => {
    if (!formData.value || submitting.value) return;
    if (!props.id) {
      errorMessage.value = "イベントIDが不正です。";
      return;
    }

    errorMessage.value = null;
    submitting.value = true;
    try {
      const payload: Unbrand<SaveOffkaiAnswerRequest> = {
        eventId: props.id,
        commitmentAnswers: formData.value.commitmentQuestions.map((question) => ({
          questionId: question.id,
          answer: commitmentAnswers.value[question.id] ?? "no",
        })),
        preferenceAnswers: formData.value.preferenceQuestions.map((question) => ({
          questionId: question.id,
          answer: preferenceAnswers.value[question.id] ?? "",
        })),
      };

      await put(`/offkai-event/${props.id}/answers`, payload);
      success("回答を送信しました。")
      await router.push("/dashboard");
    } catch {
      errorMessage.value = "回答の送信に失敗しました。";
      error("回答の送信に失敗しました。")
    } finally {
      submitting.value = false;
    }
  };
</script>

<style scoped>
.status {
  color: #4b5563;
}

.status-error {
  color: #b91c1c;
}
</style>
