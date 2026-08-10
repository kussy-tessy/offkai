<template>
  <div class="space-y-4">
    <p v-if="loading" class="status">回答フォームを読み込み中です...</p>
    <p v-else-if="errorMessage" class="status status-error">{{ errorMessage }}</p>

    <form v-if="formData" class="space-y-10" @submit.prevent="submit">
      <!-- イベント情報ヘッダー -->
      <div class="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h1 class="text-2xl font-bold text-blue-900">{{ formData.event.title }}</h1>
        <p class="text-sm text-blue-700 mt-1">開催日：{{ formatPeriodWithDay(formData.event.eventPeriod) }}</p>
        <p v-if="isOwnerEdit && formData.respondent" class="font-semibold text-blue-900 mt-2">
          {{ formData.respondent.displayName }}さんの回答を編集
        </p>
      </div>

      <CommitmentAnswers :questions="formData.commitmentQuestions" :answers="commitmentAnswers"
        :on-change="updateCommitmentAnswer" :validation-messages="commitmentValidationMessages"
        :allow-empty="canBypassParticipationRestrictions" />
      <PreferenceAnswers :questions="formData.preferenceQuestions" :answers="preferenceAnswers"
        :on-change="updatePreferenceAnswer" :validation-messages="preferenceValidationMessages"
        :allow-empty="canBypassParticipationRestrictions" />
      <BringingKigurumiAnswers v-if="formData.askBringingKigurumi" :options="kigurumiOptions"
        :selected="bringingKigurumis" :can-manage="!isOwnerEdit" :on-change="updateBringingKigurumis"
        :on-options-change="updateKigurumiOptions" />

      <div class="flex justify-center pt-8">
        <MyButton color="primary" type="submit" :disabled="submitting" class="px-12 py-3 text-lg font-bold">
          {{ submitting ? "送信中..." : isOwnerEdit ? "回答を更新" : "送信" }}
        </MyButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
  import type {
    BringingKigurumi,
    GetMyAnswerFormResponse,
    Kigurumi,
    SaveOffkaiAnswerRequest,
    Unbrand,
  } from "@offkai/core";
  import { formatPeriodWithDay } from "@offkai/core";
  import { computed, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
  import BringingKigurumiAnswers from "@/features/answer/components/BringingKigurumiAnswers.vue";
  import CommitmentAnswers from "@/features/answer/components/CommitmentAnswers.vue";
  import PreferenceAnswers from "@/features/answer/components/PreferenceAnswers.vue";
  import {
    useCommitmentAnswers,
    usePreferenceAnswers,
  } from "@/features/answer/composables";

  const props = defineProps<{
    id: string;
    userId?: string;
  }>();
  const isOwnerEdit = computed(() => Boolean(props.userId));
  const formApiPath = computed(() =>
    props.userId
      ? `/offkai-event/${props.id}/answers/${props.userId}/form`
      : `/offkai-event/${props.id}/my-answer-form`,
  );
  const saveApiPath = computed(() =>
    props.userId ? `/offkai-event/${props.id}/answers/${props.userId}` : `/offkai-event/${props.id}/answers`,
  );

  const { get, put, loading } = useApi();
  const { success, error } = useToast();
  const router = useRouter();
  const errorMessage = ref<string | null>(null);
  const submitting = ref(false);

  const formData = ref<Unbrand<GetMyAnswerFormResponse> | null>(null);
  const canBypassParticipationRestrictions = computed(
    () => formData.value?.canBypassParticipationRestrictions === true,
  );

  const { answers: commitmentAnswers, updateAnswer: updateCommitmentAnswer } =
    useCommitmentAnswers([]);
  const { answers: preferenceAnswers, updateAnswer: updatePreferenceAnswer } =
    usePreferenceAnswers([]);
  const kigurumiOptions = ref<Unbrand<Kigurumi>[]>([]);
  const bringingKigurumis = ref<Unbrand<BringingKigurumi>[]>([]);

  const updateBringingKigurumis = (selected: Unbrand<BringingKigurumi>[]) => {
    bringingKigurumis.value = selected;
  };

  const updateKigurumiOptions = (options: Unbrand<Kigurumi>[]) => {
    kigurumiOptions.value = options;
  };

  const commitmentValidationMessages = computed<Record<string, string>>(() => {
    const data = formData.value;
    if (!data) return {};

    const messages: Record<string, string> = {};
    for (const question of data.commitmentQuestions) {
      if (!question.required || !question.canEdit) continue;
      const answer = commitmentAnswers.value[question.id];
      if (answer !== "yes" && answer !== "no") {
        messages[question.id] = "選択してください";
      }
    }
    return messages;
  });

  const preferenceValidationMessages = computed<Record<string, string>>(() => {
    const data = formData.value;
    if (!data) return {};

    const messages: Record<string, string> = {};
    for (const question of data.preferenceQuestions) {
      if (!question.required) continue;

      const answer = preferenceAnswers.value[question.id] ?? "";
      const trimmed = answer.trim();
      const isOtherWithoutText =
        answer.startsWith("その他: ") &&
        answer.slice("その他: ".length).trim().length === 0;

      if (trimmed.length === 0 || isOtherWithoutText) {
        messages[question.id] = "入力してください";
      }
    }

    return messages;
  });

  const hasRequiredValidationErrors = computed(
    () =>
      Object.keys(commitmentValidationMessages.value).length > 0 ||
      Object.keys(preferenceValidationMessages.value).length > 0,
  );

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

    kigurumiOptions.value = data.kigurumiOptions;
    bringingKigurumis.value = data.bringingKigurumis;
  }

  onMounted(async () => {
    errorMessage.value = null;
    if (!props.id) {
      errorMessage.value = "イベントIDが不正です。";
      return;
    }

    try {
      const data = await get<Unbrand<GetMyAnswerFormResponse>>(formApiPath.value);
      if (!data) {
        errorMessage.value = "回答フォームの取得に失敗しました。";
        return;
      }
      formData.value = data;
      hydrateAnswers(data);
    } catch (cause) {
      errorMessage.value = getApiErrorMessage(cause, "回答フォームの取得に失敗しました。");
    }
  });

  const submit = async () => {
    if (!formData.value || submitting.value) return;
    if (!props.id) {
      errorMessage.value = "イベントIDが不正です。";
      return;
    }

    if (hasRequiredValidationErrors.value) {
      errorMessage.value = "必須項目を入力してください。";
      return;
    }

    errorMessage.value = null;
    submitting.value = true;
    try {
      const payload: Unbrand<SaveOffkaiAnswerRequest> = {
        eventId: props.id,
        commitmentAnswers: formData.value.commitmentQuestions.map((question) => ({
          questionId: question.id,
          answer: commitmentAnswers.value[question.id] ?? null,
        })),
        preferenceAnswers: formData.value.preferenceQuestions.map((question) => ({
          questionId: question.id,
          answer: preferenceAnswers.value[question.id]?.trim()
            ? preferenceAnswers.value[question.id]
            : null,
        })),
        bringingKigurumis: formData.value.askBringingKigurumi
          ? bringingKigurumis.value
          : [],
      };

      await put(saveApiPath.value, payload);
      success(isOwnerEdit.value ? "回答を更新しました。" : "回答を送信しました。")
      await router.push(
        isOwnerEdit.value
          ? `/offkai/${props.id}/participants/answers`
          : "/dashboard",
      );
    } catch (cause) {
      const message = getApiErrorMessage(cause, "回答の送信に失敗しました。");
      errorMessage.value = message;
      error(message)
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
