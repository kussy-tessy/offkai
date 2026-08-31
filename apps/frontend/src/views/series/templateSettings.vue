<template>
  <main class="space-y-6">
    <div>
      <h1 class="text-3xl">オフ会テンプレート設定</h1>
      <p class="mt-2 text-sm text-gray-600">
        新しいオフ会を作成するとき、ここで設定した質問が初期表示されます。
      </p>
    </div>
    <div v-if="initialLoading" class="py-8 text-center text-sm text-gray-400">読み込み中…</div>
    <template v-else>
      <section class="space-y-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
        <h2 class="text-xl font-semibold text-slate-800">アクセス設定</h2>
        <MyFormField v-slot="{ id }" label="参加表明できる人">
          <MySelectBox :id="id" v-model="participationEligibility" :options="participationEligibilityOptions" />
        </MyFormField>
        <h3 class="pt-2 text-base font-semibold text-slate-700">公開範囲</h3>
        <MyFormField v-slot="{ id }" label="オフ会概要">
          <MySelectBox :id="id" v-model="overviewVisibility" :options="overviewVisibilityOptions" />
        </MyFormField>
        <MyFormField v-slot="{ id }" label="参加者一覧・回答">
          <MySelectBox :id="id" v-model="participantsVisibility" :options="visibilityOptions"
            :error="errors.participantsVisibility" />
        </MyFormField>
        <p v-if="!hasDiscordGuild" class="text-xs text-amber-700">
          Discordサーバー参加者を選ぶには、先にシリーズ設定でDiscordサーバーIDを設定してください。
        </p>
      </section>
      <section class="rounded-md border-2 border-teal-200 bg-teal-50 px-4 py-3 shadow-sm">
        <MyCheckbox :value="askBringingKigurumi" :on-change="value => askBringingKigurumi = value"
          class="text-base font-semibold text-slate-800">
          連れてくる着ぐるみさんを聞く
        </MyCheckbox>
      </section>
      <section>
        <h2 class="mb-2 text-xl font-semibold">アンケート</h2>
      <PreferenceQuestions :store="questionStore" :errors="errors" />
      </section>
      <MyButton class="w-full" color="primary" :loading="saving" :disabled="saving" @click="save">
        テンプレートを保存する
      </MyButton>
    </template>
  </main>
</template>

<script setup lang="ts">
  import type { EventVisibility, GetSeriesQuestionTemplateResponse, GetSeriesSettingsResponse, ParticipationEligibility, UpdateSeriesQuestionTemplateRequest } from "@offkai/core";
  import { isVisibilityAtLeastAsRestricted } from "@offkai/core";
  import { onMounted, ref } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyCheckbox from "@/common/components/MyCheckbox.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue";
  import { getApiErrorMessage, isEmpty, useApi, useFieldErrorsComposable, useToast } from "@/common/composables";
  import PreferenceQuestions from "@/features/offkaiEvent/components/PreferenceQuestions.vue";
  import { usePreferenceQuestions } from "@/features/offkaiEvent/composables";

  const { get, put } = useApi();
  const { success, error } = useToast();
  const questionStore = usePreferenceQuestions();
  const { errors, reset, hasAny } = useFieldErrorsComposable();
  const initialLoading = ref(true);
  const saving = ref(false);
  const hasDiscordGuild = ref(false);
  const askBringingKigurumi = ref(false);
  const overviewVisibility = ref<EventVisibility>("AUTHENTICATED");
  const participantsVisibility = ref<EventVisibility>("AUTHENTICATED");
  const participationEligibility = ref<ParticipationEligibility>("AUTHENTICATED");
  const visibilityOptions: SelectOption[] = [
    { value: "PUBLIC", label: "誰でも" },
    { value: "AUTHENTICATED", label: "ログインユーザー" },
    { value: "GUILD_MEMBERS", label: "Discordサーバー参加者" },
    { value: "PARTICIPANTS", label: "オフ会参加表明者" },
  ];
  const overviewVisibilityOptions = visibilityOptions.filter((option) => option.value !== "PARTICIPANTS");
  const participationEligibilityOptions: SelectOption[] = [
    { value: "AUTHENTICATED", label: "ログインユーザー" },
    { value: "GUILD_MEMBERS", label: "Discordサーバー参加者" },
  ];

  onMounted(async () => {
    try {
      const [template, settings] = await Promise.all([
        get<GetSeriesQuestionTemplateResponse>("/series/my/question-template"),
        get<GetSeriesSettingsResponse>("/series/my/settings"),
      ]);
      questionStore.initialize({ questions: template?.preferenceQuestions ?? [] });
      askBringingKigurumi.value = template?.askBringingKigurumi ?? false;
      overviewVisibility.value = template?.overviewVisibility ?? "AUTHENTICATED";
      participantsVisibility.value = template?.participantsVisibility ?? "AUTHENTICATED";
      participationEligibility.value = template?.participationEligibility ?? "AUTHENTICATED";
      hasDiscordGuild.value = Boolean(settings?.discordGuildId);
      if (!hasDiscordGuild.value) {
        for (const option of visibilityOptions) {
          if (option.value === "GUILD_MEMBERS") option.disabled = true;
        }
        participationEligibilityOptions[1].disabled = true;
      }
    } catch (cause) {
      questionStore.initialize({ questions: [] });
      error(getApiErrorMessage(cause, "アンケートテンプレートの読み込みに失敗しました。"));
    } finally {
      initialLoading.value = false;
    }
  });

  const validate = () => {
    reset();
    if (!isVisibilityAtLeastAsRestricted(participantsVisibility.value, overviewVisibility.value)) {
      errors.value.participantsVisibility = "参加者一覧・回答の公開範囲は、オフ会概要と同じか、より限定してください";
    }
    for (const [index, question] of questionStore.questions.value.entries()) {
      if (isEmpty(question.question)) {
        errors.value[`preferenceQuestions.${index}.question`] = "アンケート質問を入力してください";
      }
      if (question.answerTemplate.type !== "free") {
        const choices = question.answerTemplate.choices ?? [];
        if (choices.some(isEmpty)) {
          errors.value[`preferenceQuestions.${index}.choices`] = "選択肢の空欄を埋めてください";
        }
      }
    }
    return !hasAny();
  };

  const save = async () => {
    if (!validate()) return;
    const payload: UpdateSeriesQuestionTemplateRequest = {
      preferenceQuestions: questionStore.questions.value.map((question) => ({
        question: question.question,
        description: question.description,
        required: question.required,
        answerTemplate: question.answerTemplate.type === "free"
          ? { type: "free" }
          : { type: question.answerTemplate.type, choices: question.answerTemplate.choices ?? [] },
      })),
      askBringingKigurumi: askBringingKigurumi.value,
      overviewVisibility: overviewVisibility.value,
      participantsVisibility: participantsVisibility.value,
      participationEligibility: participationEligibility.value,
    };
    saving.value = true;
    try {
      await put("/series/my/question-template", payload);
      success("アンケートテンプレートを保存しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "アンケートテンプレートの保存に失敗しました。"));
    } finally {
      saving.value = false;
    }
  };
</script>
