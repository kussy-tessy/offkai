<script setup lang="ts">
import { ref, watch } from "vue";
import { faImage, faArrowUpFromBracket, faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { GUIDE_IMAGE_MAX_BYTES } from "@offkai/core";
import MyButton from "@/common/components/MyButton.vue";
import ImageUploader from "@/common/components/ImageUploader.vue";
import ImageViewer from "@/common/components/ImageViewer.vue";
import type { ImageUploadHandler, ViewerImage } from "@/common/components/ImageUploader.types";
import { getApiErrorMessage, useApi } from "@/common/composables";

const props = defineProps<{ kigurumiId: string; label: string; hasImage?: boolean; eventId?: string; editable?: boolean; thumbnail?: boolean }>();
const { get, post, del } = useApi();
const hasImage = ref(Boolean(props.hasImage));
const preview = ref<ViewerImage | null>(null);
const viewerImage = ref<ViewerImage | null>(null);
const open = ref(false);
const editing = ref(false);
const busy = ref(false);
const message = ref("");
const uploadKey = ref(0);
const base = () => `/kigurumi/${props.kigurumiId}/image`;
async function fetchImage() {
  const result = await get<{ url: string; width: number; height: number }>(base(), props.eventId ? { params: { eventId: props.eventId } } : undefined);
  if (!result) throw new Error("画像を読み込めませんでした。");
  return { src: result.url, width: result.width, height: result.height, alt: props.label };
}
async function loadPreview() {
  if (!props.thumbnail || !hasImage.value) return;
  try { preview.value = await fetchImage(); }
  catch (cause) { message.value = getApiErrorMessage(cause, "画像を読み込めませんでした。"); }
}
watch(() => [props.kigurumiId, props.hasImage], () => {
  hasImage.value = Boolean(props.hasImage);
  preview.value = null;
  open.value = false;
  void loadPreview();
}, { immediate: true });
async function show() {
  if (busy.value) return;
  busy.value = true;
  message.value = "";
  try { viewerImage.value = await fetchImage(); open.value = true; }
  catch (cause) { message.value = getApiErrorMessage(cause, "画像を開けませんでした。"); }
  finally { busy.value = false; }
}
const upload: ImageUploadHandler = async (file, { signal, onProgress }) => {
  busy.value = true;
  message.value = "";
  try {
    return await post(base(), file, {
      headers: { "Content-Type": "application/octet-stream" }, signal, timeout: 120_000,
      onUploadProgress: event => { if (event.total) onProgress(event.loaded / event.total * 100); },
    });
  } finally { busy.value = false; }
};
async function uploaded() {
  hasImage.value = true;
  editing.value = false;
  uploadKey.value++;
  await loadPreview();
}
async function remove() {
  if (busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    await del(base());
    hasImage.value = false;
    preview.value = null;
    open.value = false;
  } catch (cause) { message.value = getApiErrorMessage(cause, "画像を削除できませんでした。"); }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="space-y-2">
    <button v-if="hasImage" type="button" :disabled="busy" :aria-label="`${label}の画像を拡大`"
      class="inline-flex max-w-full items-center gap-2 rounded text-left text-sky-700 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50" @click="show">
      <img v-if="thumbnail && preview" :src="preview.src" :alt="label" class="h-16 w-16 shrink-0 rounded border object-contain" />
      <template v-else><FontAwesomeIcon :icon="faImage" class="shrink-0" /><span class="break-words">{{ label }}</span></template>
    </button>
    <span v-else-if="!thumbnail">{{ label }}</span>
    <template v-if="editable">
      <div class="flex flex-wrap gap-2">
        <MyButton type="button" color="secondary" variant="ghost" size="sm"
          class="inline-flex min-h-10 items-center justify-center gap-2" :disabled="busy"
          :aria-expanded="editing" @click="editing = !editing">
          <FontAwesomeIcon :icon="hasImage ? faPenToSquare : faArrowUpFromBracket" aria-hidden="true" />
          <span>{{ hasImage ? '画像を変更' : '画像を登録' }}</span>
        </MyButton>
        <MyButton v-if="hasImage" type="button" color="red" variant="ghost" size="sm"
          class="inline-flex min-h-10 items-center justify-center gap-2" :disabled="busy" @click="remove">
          <FontAwesomeIcon :icon="faTrashCan" aria-hidden="true" />
          <span>画像を削除</span>
        </MyButton>
      </div>
      <div v-if="editing" class="space-y-2">
        <p class="text-xs text-slate-600">1体につき1枚。画像の変更はすぐ保存され、すべてのイベントに反映されます。</p>
        <ImageUploader :key="uploadKey" :upload="upload" :multiple="false" :max-file-size="GUIDE_IMAGE_MAX_BYTES"
          @uploaded="uploaded" @error="message = getApiErrorMessage($event.error, '画像を保存できませんでした。')" />
      </div>
    </template>
    <p v-if="message" role="alert" class="text-sm text-red-700">{{ message }}</p>
    <ImageViewer v-model:open="open" :image="viewerImage" @error="message = $event" />
  </div>
</template>
