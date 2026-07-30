<template>
  <div class="space-y-8">
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

    <template v-else-if="page && detail">
      <OffkaiDetailHeader
        :offkai="detail.offkai"
        :has-answered="true"
				:permissions="detail.viewer.permissions"
      />

      <p class="text-sm text-slate-600">
        外部アップローダーに保存した写真のURLを参加者へ共有できます。
      </p>
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
  import type { OffkaiDetail, Unbrand } from "@offkai/core";
  import { computed, ref } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import { getApiErrorMessage, useApi } from "@/common/composables";
  import OffkaiDetailHeader from "@/features/offkaiDetail/components/OffkaiDetailHeader.vue";
  import type { PhotoShare, PhotoSharePage } from "../types";
  import PhotoShareCreateForm from "./PhotoShareCreateForm.vue";
  import PhotoShareList from "./PhotoShareList.vue";

  const props = defineProps<{
    id: string;
  }>();

  const { get: getPhotoShares, loading: photoSharesLoading } = useApi();
  const { get: getDetail, loading: detailLoading } = useApi();
  const page = ref<PhotoSharePage | null>(null);
  const detail = ref<Unbrand<OffkaiDetail> | null>(null);
  const loadError = ref<unknown>(null);
  const loading = computed(() => photoSharesLoading.value || detailLoading.value);
  const errorMessage = computed(() =>
    loadError.value
      ? getApiErrorMessage(loadError.value, "写真共有の読み込みに失敗しました。")
      : "",
  );

  const load = async () => {
    page.value = null;
    detail.value = null;
    loadError.value = null;
    try {
      const [loadedPage, loadedDetail] = await Promise.all([
        getPhotoShares<PhotoSharePage>(`/offkai-event/${props.id}/photo-shares`),
        getDetail<Unbrand<OffkaiDetail>>(`/offkai-event/${props.id}/detail`),
      ]);
      page.value = loadedPage;
      detail.value = loadedDetail;
    } catch (cause) {
      loadError.value = cause;
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
