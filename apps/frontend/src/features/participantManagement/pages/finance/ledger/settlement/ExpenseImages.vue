<script setup lang="ts">
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { FINANCE_EXPENSE_IMAGE_MAX_COUNT, GUIDE_IMAGE_MAX_BYTES, type FinanceExpenseImage } from "@offkai/core";
import { ref, watch } from "vue";
import ImageUploader from "@/common/components/ImageUploader.vue";
import ImageViewer from "@/common/components/ImageViewer.vue";
import type { ImageUploadHandler, ViewerImage } from "@/common/components/ImageUploader.types";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi } from "@/common/composables";
import { useLedgerSession } from "../composables/useLedgerSession";

const props = defineProps<{ eventId: string; expenseId: string; editable: boolean }>();
const { get, post, del } = useApi();
const { expenseImageRefreshVersion } = useLedgerSession();
const images = ref<FinanceExpenseImage[]>([]);
const error = ref("");
const uploadKey = ref(0);
const viewerOpen = ref(false);
const viewerImages = ref<ViewerImage[]>([]);
const viewerIndex = ref(0);
const deleting = ref(false);
const deleteTarget = ref<FinanceExpenseImage | null>(null);
const ids = new WeakMap<File, string>();
const base = () => `/offkai-event/${props.eventId}/finance-ledger/expenses/${props.expenseId}/images`;
async function load() {
  error.value = "";
  try { images.value = (await get<FinanceExpenseImage[]>(base())) ?? []; }
  catch (cause) { error.value = getApiErrorMessage(cause, "領収書画像を読み込めませんでした。"); }
}
const upload: ImageUploadHandler = (file, { signal, onProgress }) => {
  let id = ids.get(file);
  if (!id) { id = crypto.randomUUID(); ids.set(file, id); }
  return post(`${base()}/${id}`, file, {
    headers: { "Content-Type": "application/octet-stream" }, signal, timeout: 120_000,
    onUploadProgress: (event) => { if (event.total) onProgress(event.loaded / event.total * 100); },
  });
};
async function uploaded() { uploadKey.value++; await load(); }
async function openImage(image: FinanceExpenseImage) {
  try {
    const fresh = await get<FinanceExpenseImage[]>(base());
    if (!fresh) return;
    images.value = fresh;
    viewerImages.value = fresh.map((item, index) => ({ src: item.url, width: item.width, height: item.height, alt: `領収書画像${index + 1}` }));
    viewerIndex.value = Math.max(0, fresh.findIndex((item) => item.id === image.id));
    viewerOpen.value = true;
  } catch (cause) { error.value = getApiErrorMessage(cause, "画像を開けませんでした。"); }
}
async function remove() {
  if (!deleteTarget.value || deleting.value) return;
  deleting.value = true;
  try { await del(`${base()}/${deleteTarget.value.id}`); deleteTarget.value = null; await load(); }
  catch (cause) { error.value = getApiErrorMessage(cause, "画像を削除できませんでした。"); }
  finally { deleting.value = false; }
}
watch(() => [props.eventId, props.expenseId, expenseImageRefreshVersion.value], load, { immediate: true });
</script>

<template>
  <div class="mt-3 space-y-2">
    <p class="text-sm font-medium text-slate-600">領収書画像 {{ images.length }} / {{ FINANCE_EXPENSE_IMAGE_MAX_COUNT }}枚</p>
    <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
    <div v-if="images.length" class="flex flex-wrap gap-2">
      <div v-for="(image, index) in images" :key="image.id" class="relative">
        <button type="button" class="block h-16 w-16 overflow-hidden rounded border bg-white" :aria-label="`領収書画像${index + 1}を拡大`" @click="openImage(image)">
          <img :src="image.url" :width="image.width" :height="image.height" :alt="`領収書画像${index + 1}`" class="h-full w-full object-cover" />
        </button>
        <button v-if="editable" type="button" class="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-700 shadow" :aria-label="`領収書画像${index + 1}を削除`" title="削除" @click="deleteTarget = image">
          <FontAwesomeIcon :icon="faTrash" aria-hidden="true" />
        </button>
      </div>
    </div>
    <ImageUploader v-if="editable && images.length < FINANCE_EXPENSE_IMAGE_MAX_COUNT" :key="uploadKey" :upload="upload" :multiple="false" :max-files="1" :max-file-size="GUIDE_IMAGE_MAX_BYTES" @uploaded="uploaded" @error="error = getApiErrorMessage($event.error, '画像をアップロードできませんでした。')" />
    <ImageViewer v-model:open="viewerOpen" :images="viewerImages" :initial-index="viewerIndex" @error="error = $event" />
    <MyConfirmDialog :open="!!deleteTarget" title="領収書画像を削除" message="この画像を削除します。この操作は取り消せません。" confirm-label="削除する" confirm-color="red" :loading="deleting" @update:open="(value) => { if (!value && !deleting) deleteTarget = null; }" @confirm="remove" />
  </div>
</template>
