<template>
  <main class="space-y-6">
    <div>
      <h1 class="text-3xl">アンケートテンプレート設定</h1>
      <p class="mt-2 text-sm text-gray-600">
        新しいオフ会を作成するとき、ここで設定した質問が初期表示されます。
      </p>
    </div>

    <div v-if="initialLoading" class="py-8 text-center text-sm text-gray-400">
      読み込み中…
    </div>

    <template v-else>
      <PreferenceQuestions :store="questionStore" :errors="errors" />
      <MyButton class="w-full" color="primary" :loading="saving" :disabled="saving" @click="save">
        テンプレートを保存する
      </MyButton>
    </template>
  </main>
</template>

<script setup lang="ts">
  import type {
    GetSeriesQuestionTemplateResponse,
    UpdateSeriesQuestionTemplateRequest,
  } from "@offkai/core";
  import { onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import { getApiErrorMessage, isEmpty, useApi, useFieldErrorsComposable, useToast } from "@/common/composables";
  import PreferenceQuestions from "@/features/offkaiEvent/components/PreferenceQuestions.vue";
  import { usePreferenceQuestions } from "@/features/offkaiEvent/composables";

  const { get, put } = useApi();
  const { success, error } = useToast();
  const router = useRouter();
  const questionStore = usePreferenceQuestions();
  const { errors, reset, hasAny } = useFieldErrorsComposable();
  const initialLoading = ref(true);
  const saving = ref(false);

  onMounted(async () => {
    try {
      const template = await get<GetSeriesQuestionTemplateResponse>("/series/my/question-template");
      questionStore.initialize({
        questions: template?.preferenceQuestions ?? [],
      });
    } catch (cause) {
      questionStore.initialize({ questions: [] });
      error(getApiErrorMessage(cause, "アンケートテンプレートの読み込みに失敗しました。"));
    } finally {
      initialLoading.value = false;
    }
  });

  const validate = () => {
    reset();

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
        answerTemplate:
          question.answerTemplate.type === "free"
            ? { type: "free" }
            : {
                type: question.answerTemplate.type,
                choices: question.answerTemplate.choices ?? [],
              },
      })),
    };

    saving.value = true;
    try {
      await put("/series/my/question-template", payload);
      success("アンケートテンプレートを保存しました。");
      await router.push("/dashboard");
    } catch (cause) {
      error(getApiErrorMessage(cause, "アンケートテンプレートの保存に失敗しました。"));
    } finally {
      saving.value = false;
    }
  };
</script>
