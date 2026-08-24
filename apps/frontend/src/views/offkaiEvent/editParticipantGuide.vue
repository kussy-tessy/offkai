<template>
  <main class="space-y-6">
    <MyBackLink :to="`/offkai/${id}/participant-guide`">参加者向け情報へ戻る</MyBackLink>
    <h1 class="text-3xl">参加者向け情報の編集</h1>

    <div v-if="loading" class="py-8 text-center text-sm text-gray-400">読み込み中…</div>
    <template v-else>
      <MyFormField v-slot="{ id: fieldId }" label="参加者向け情報">
        <MyTextarea
          :id="fieldId"
          :value="description"
          :on-change="value => description = value"
          rows="16"
          maxlength="1000"
        />
        <p class="mt-1 text-sm text-slate-500">
          参加表明を送信したユーザーと運営者だけに表示されます。
        </p>
      </MyFormField>

      <MyButton class="w-full" color="primary" :disabled="saving" @click="save">
        参加者向け情報を更新する
      </MyButton>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { ParticipantGuideResponse } from "@offkai/core";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import MyBackLink from "@/common/components/MyBackLink.vue";
import MyButton from "@/common/components/MyButton.vue";
import MyFormField from "@/common/components/MyFormField.vue";
import MyTextarea from "@/common/components/MyTextarea.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

const { id } = defineProps<{ id: string }>();
const router = useRouter();
const { get, put } = useApi();
const { success, error } = useToast();
const description = ref("");
const loading = ref(true);
const saving = ref(false);

onMounted(async () => {
  try {
    const guide = await get<ParticipantGuideResponse>(`/offkai-event/${id}/participant-guide`);
    description.value = guide?.description ?? "";
  } catch (cause) {
    error(getApiErrorMessage(cause, "参加者向け情報の読み込みに失敗しました。"));
  } finally {
    loading.value = false;
  }
});

const save = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    await put(`/offkai-event/${id}/participant-guide`, { description: description.value });
    success("参加者向け情報を更新しました。");
    await router.push(`/offkai/${id}/participant-guide`);
  } catch (cause) {
    error(getApiErrorMessage(cause, "参加者向け情報の更新に失敗しました。"));
  } finally {
    saving.value = false;
  }
};
</script>
