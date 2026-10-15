<script setup lang="ts">
import {
  GUIDE_IMAGE_MAX_BYTES,
  GUIDE_IMAGE_MAX_COUNT,
  type ParticipantGuideImage,
} from "@offkai/core";
import { onBeforeUnmount, ref, watch } from "vue";
import ImageUploader from "@/common/components/ImageUploader.vue";
import ImageViewer from "@/common/components/ImageViewer.vue";
import type {
  ImageUploadHandler,
  ViewerImage,
} from "@/common/components/ImageUploader.types";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi } from "@/common/composables";

const props = withDefaults(
  defineProps<{ eventId: string; editable?: boolean }>(),
  { editable: false },
);
const { get, post, del } = useApi();
const images = ref<ParticipantGuideImage[]>([]);
const loading = ref(true);
const loadError = ref("");
const actionError = ref("");
const uploadKey = ref(0);
const viewerOpen = ref(false);
const viewerImages = ref<ViewerImage[]>([]);
const viewerIndex = ref(0);
const opening = ref<string | null>(null);
const removing = ref(false);
const deleteTarget = ref<ParticipantGuideImage | null>(null);
const uploadIds = new WeakMap<File, string>();
let active = true;
let generation = 0;
const base = () => `/offkai-event/${props.eventId}/participant-guide/images`;

async function load() {
  const current = generation;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await get<ParticipantGuideImage[]>(base());
    if (active && current === generation) images.value = result ?? [];
  } catch (cause) {
    if (active && current === generation)
      loadError.value = getApiErrorMessage(
        cause,
        "画像一覧を読み込めませんでした。",
      );
  } finally {
    if (active && current === generation) loading.value = false;
  }
}

const upload: ImageUploadHandler = async (file, { signal, onProgress }) => {
  actionError.value = "";
  let imageId = uploadIds.get(file);
  if (!imageId) {
    imageId = crypto.randomUUID();
    uploadIds.set(file, imageId);
  }
  return post(`${base()}/${imageId}`, file, {
    headers: { "Content-Type": "application/octet-stream" },
    signal,
    timeout: 120_000,
    onUploadProgress: (event) => {
      if (event.total) onProgress((event.loaded / event.total) * 100);
    },
  });
};
async function uploaded() {
  uploadKey.value++; // A fresh single-file picker for the next image.
  await load();
}
async function openImage(image: ParticipantGuideImage) {
  if (opening.value) return;
  const current = generation;
  opening.value = image.id;
  actionError.value = "";
  try {
    // Refresh every URL so neighbouring slides also work after a long page session.
    const fresh = await get<ParticipantGuideImage[]>(base());
    if (!fresh || !active || current !== generation) return;
    const index = fresh.findIndex((item) => item.id === image.id);
    images.value = fresh;
    if (index < 0) {
      actionError.value = "この画像は削除されています。";
      return;
    }
    viewerImages.value = fresh.map((item, i) => ({
      src: item.url,
      width: item.width,
      height: item.height,
      alt: `案内画像${i + 1}`,
    }));
    viewerIndex.value = index;
    viewerOpen.value = true;
  } catch (cause) {
    if (active && current === generation)
      actionError.value = getApiErrorMessage(cause, "画像を開けませんでした。");
  } finally {
    if (active && current === generation) opening.value = null;
  }
}
async function remove() {
  if (!deleteTarget.value || removing.value) return;
  removing.value = true;
  actionError.value = "";
  try {
    await del(`${base()}/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await load();
  } catch (cause) {
    actionError.value = getApiErrorMessage(
      cause,
      "画像を削除できませんでした。",
    );
  } finally {
    removing.value = false;
  }
}
watch(
  () => props.eventId,
  () => {
    generation++;
    images.value = [];
    viewerOpen.value = false;
    deleteTarget.value = null;
    opening.value = null;
    uploadKey.value++;
    void load();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  active = false;
  generation++;
});
</script>

<template>
  <section class="space-y-4" aria-label="参加者向け案内画像">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold">
        案内画像
        <span class="text-sm font-normal text-slate-500"
          >{{ images.length }} / {{ GUIDE_IMAGE_MAX_COUNT }}枚</span
        >
      </h2>
      <button
        type="button"
        class="min-h-11 px-3 text-sm text-blue-700 disabled:opacity-50"
        :disabled="loading"
        @click="load"
      >
        一覧を再読み込み
      </button>
    </div>
    <p v-if="loading" role="status" class="text-sm text-slate-500">
      画像を読み込み中…
    </p>
    <p v-if="loadError" role="alert" class="text-sm text-red-700">
      {{ loadError }}
    </p>
    <p v-if="actionError" role="alert" class="text-sm text-red-700">
      {{ actionError }}
    </p>
    <p
      v-if="!loading && !loadError && !images.length"
      class="text-sm text-slate-500"
    >
      案内画像はまだありません。
    </p>
    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <li
        v-for="(image, index) in images"
        :key="image.id"
        class="min-w-0 space-y-1"
      >
        <button
          type="button"
          class="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-visible:ring-4 focus-visible:ring-blue-300"
          :disabled="!!opening"
          :aria-label="`案内画像${index + 1}を拡大`"
          @click="openImage(image)"
        >
          <img
            :src="image.url"
            :width="image.width"
            :height="image.height"
            :alt="`案内画像${index + 1}`"
            class="aspect-square w-full object-contain"
          />
        </button>
        <button
          v-if="editable"
          type="button"
          class="min-h-11 w-full rounded px-3 text-sm text-red-700"
          :disabled="removing"
          :aria-label="`案内画像${index + 1}を削除`"
          @click="deleteTarget = image"
        >
          削除
        </button>
      </li>
    </ul>
    <template v-if="editable">
      <p class="text-sm text-slate-500">
        画像は1枚ずつ追加できます。追加・削除はその場で保存され、文章の更新とは別に反映されます。
      </p>
      <p
        v-if="images.length >= GUIDE_IMAGE_MAX_COUNT"
        class="text-sm text-slate-600"
      >
        20枚に達しています。追加する場合は不要な画像を削除してください。
      </p>
      <ImageUploader
        :key="uploadKey"
        :upload="upload"
        :multiple="false"
        :max-file-size="GUIDE_IMAGE_MAX_BYTES"
        :disabled="
          loading || !!loadError || images.length >= GUIDE_IMAGE_MAX_COUNT
        "
        @uploaded="uploaded"
        @error="
          actionError = getApiErrorMessage(
            $event.error,
            '画像をアップロードできませんでした。',
          )
        "
      />
    </template>
    <ImageViewer
      v-model:open="viewerOpen"
      :images="viewerImages"
      :initial-index="viewerIndex"
      @error="actionError = $event"
    />
    <MyConfirmDialog
      :open="!!deleteTarget"
      title="案内画像を削除"
      message="この画像を削除します。この操作は取り消せません。"
      confirm-label="削除する"
      confirm-color="red"
      :loading="removing"
      @update:open="
        (value) => {
          if (!value && !removing) deleteTarget = null;
        }
      "
      @confirm="remove"
    />
  </section>
</template>
