<template>
  <div class="space-y-8">
    <MyBackLink :to="`/offkai/${id}/detail`">オフ会詳細へ戻る</MyBackLink>

    <div v-if="loading" class="py-16 text-center text-slate-500">
      読み込み中です…
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"
    >
      <p>{{ errorMessage }}</p>
      <MyButton class="mt-4" color="gray" variant="ghost" size="sm" @click="load">
        再読み込み
      </MyButton>
    </div>

    <template v-else-if="page">
      <header>
        <p class="text-sm font-medium text-teal-600">写真共有</p>
        <h1 class="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {{ page.event.title }}
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          外部アップローダーに保存した写真のURLを参加者へ共有できます。
        </p>
      </header>

      <PhotoShareCreateForm :event-id="id" :on-created="addShare" />
      <PhotoShareList
        :event-id="id"
        :shares="page.photoShares"
        :on-updated="replaceShare"
        :on-deleted="removeShare"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue";
  import MyBackLink from "@/common/components/MyBackLink.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import { getApiErrorMessage, useApi } from "@/common/composables";
  import type { PhotoShare, PhotoSharePage } from "../types";
  import PhotoShareCreateForm from "./PhotoShareCreateForm.vue";
  import PhotoShareList from "./PhotoShareList.vue";

  const props = defineProps<{
    id: string;
  }>();

  const { get, loading, error: apiError } = useApi();
  const page = ref<PhotoSharePage | null>(null);
  const errorMessage = computed(() => {
    if (apiError.value) {
      return getApiErrorMessage(
        apiError.value,
        "写真共有の読み込みに失敗しました。",
      );
    }
    if (!loading.value && page.value === null) {
      return "写真共有の読み込みに失敗しました。";
    }
    return "";
  });

  const load = async () => {
    page.value = null;
    try {
      page.value = await get<PhotoSharePage>(
        `/offkai-event/${props.id}/photo-shares`,
      );
    } catch {
      // useApiが公開するerrorを表示に使用する。
    }
  };

  const addShare = (share: PhotoShare) => {
    page.value?.photoShares.unshift(share);
  };

  const replaceShare = (updated: PhotoShare) => {
    if (!page.value) return;
    const index = page.value.photoShares.findIndex(
      (share) => share.id === updated.id,
    );
    if (index >= 0) page.value.photoShares[index] = updated;
  };

  const removeShare = (shareId: string) => {
    if (!page.value) return;
    page.value.photoShares = page.value.photoShares.filter(
      (share) => share.id !== shareId,
    );
  };

  void load();
</script>
