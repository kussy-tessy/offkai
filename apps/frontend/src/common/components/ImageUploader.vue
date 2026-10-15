<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { ImageUploadHandler } from "./ImageUploader.types";

const props = withDefaults(
  defineProps<{
    upload: ImageUploadHandler;
    disabled?: boolean;
    multiple?: boolean;
    maxFiles?: number;
    maxFileSize?: number;
  }>(),
  {
    disabled: false,
    multiple: true,
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024,
  },
);
const emit = defineEmits<{
  uploaded: [payload: { file: File; result: unknown }];
  error: [payload: { file: File; error: unknown }];
}>();
type Entry = {
  id: number;
  file: File;
  url: string;
  previewFailed: boolean;
  status: "ready" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
};
const entries = ref<Entry[]>([]);
const errors = ref<string[]>([]);
const dragging = ref(false);
const busy = ref(false);
const pending = computed(() =>
  entries.value.some((e) => e.status === "ready" || e.status === "error"),
);
let nextId = 0;
let dragDepth = 0;
let disposed = false;
let controller: AbortController | undefined;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function select(files: File[]) {
  if (props.disabled || busy.value) return;
  errors.value = [];
  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      errors.value.push(
        `${file.name}: JPEG・PNG・WebP・GIFを選択してください。HEICはJPEGなどに変換してください。`,
      );
      continue;
    }
    if (file.size === 0 || file.size > props.maxFileSize) {
      errors.value.push(
        `${file.name}: 0バイトより大きく、${Math.round(props.maxFileSize / 1024 / 1024)}MB以下の画像を選択してください。`,
      );
      continue;
    }
    const limit = props.multiple ? props.maxFiles : 1;
    if (entries.value.length >= limit) {
      errors.value.push(`選択できる画像は${limit}枚までです。`);
      break;
    }
    entries.value.push({
      id: nextId++,
      file,
      url: URL.createObjectURL(file),
      previewFailed: false,
      status: "ready",
    });
  }
}
function change(event: Event) {
  const element = event.target as HTMLInputElement;
  select(Array.from(element.files ?? []));
  element.value = "";
}
function drop(event: DragEvent) {
  dragging.value = false;
  dragDepth = 0;
  select(Array.from(event.dataTransfer?.files ?? []));
}
function enter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  dragDepth++;
  dragging.value = !props.disabled && !busy.value;
}
function leave() {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dragging.value = false;
}
function remove(entry: Entry) {
  if (busy.value || props.disabled) return;
  URL.revokeObjectURL(entry.url);
  entries.value = entries.value.filter((e) => e.id !== entry.id);
}
async function start() {
  if (busy.value || props.disabled) return;
  busy.value = true;
  controller = new AbortController();
  const signal = controller.signal;
  try {
    for (const entry of entries.value) {
      if (signal.aborted || props.disabled) break;
      if (entry.status === "done") continue;
      entry.status = "uploading";
      entry.error = undefined;
      entry.progress = undefined;
      try {
        const result = await props.upload(entry.file, {
          signal,
          onProgress(percent) {
            if (
              !disposed &&
              !signal.aborted &&
              entry.status === "uploading" &&
              Number.isFinite(percent)
            ) {
              entry.progress = Math.min(100, Math.max(0, percent));
            }
          },
        });
        if (disposed) return;
        entry.status = "done";
        emit("uploaded", { file: entry.file, result });
      } catch (error) {
        if (disposed) return;
        entry.status = "error";
        entry.error = "アップロードに失敗しました。再試行できます。";
        emit("error", { file: entry.file, error });
      }
    }
  } finally {
    busy.value = false;
    controller = undefined;
  }
}
onBeforeUnmount(() => {
  disposed = true;
  controller?.abort();
  for (const entry of entries.value) URL.revokeObjectURL(entry.url);
});
</script>

<template>
  <section class="space-y-4" aria-label="画像アップロード" :aria-busy="busy">
    <div
      class="rounded-lg border-2 border-dashed p-6 text-center"
      :class="
        dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
      "
      @dragenter.prevent="enter"
      @dragover.prevent
      @dragleave.prevent="leave"
      @drop.prevent="drop"
    >
      <label
        class="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white focus-within:ring-4 focus-within:ring-blue-300"
        :class="{ 'opacity-50': disabled || busy }"
      >
        画像を選択
        <input
          type="file"
          class="sr-only"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :multiple="multiple"
          :disabled="disabled || busy"
          @change="change"
        />
      </label>
      <p class="mt-3 text-sm text-slate-600">
        スマホの写真を選択、またはここに画像をドラッグ＆ドロップ
      </p>
    </div>
    <ul
      v-if="errors.length"
      role="alert"
      class="space-y-1 text-sm text-red-700"
    >
      <li v-for="(message, index) in errors" :key="index">{{ message }}</li>
    </ul>
    <ul class="space-y-3">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
      >
        <img
          v-if="!entry.previewFailed"
          :src="entry.url"
          :alt="entry.file.name"
          class="h-16 w-16 shrink-0 rounded object-cover"
          @error="entry.previewFailed = true"
        />
        <span v-else class="w-16 shrink-0 text-xs text-slate-500"
          >プレビュー不可</span
        >
        <div class="min-w-0 flex-1">
          <p class="break-all text-sm font-medium">{{ entry.file.name }}</p>
          <p class="text-xs text-slate-500">
            {{ (entry.file.size / 1024 / 1024).toFixed(1) }}MB
          </p>
          <div aria-live="polite" class="text-sm">
            <p v-if="entry.status === 'done'" class="text-green-700">
              アップロード完了
            </p>
            <p v-else-if="entry.status === 'error'" class="text-red-700">
              {{ entry.error }}
            </p>
            <template v-else-if="entry.status === 'uploading'">
              <p>
                {{
                  entry.progress === 100 ? "保存しています…" : "アップロード中…"
                }}
              </p>
              <progress
                class="w-full"
                :value="entry.progress"
                max="100"
                :aria-label="`${entry.file.name}の送信進捗`"
              />
            </template>
            <p v-else class="text-slate-500">送信待ち</p>
          </div>
        </div>
        <button
          type="button"
          class="min-h-11 shrink-0 rounded px-3 text-sm text-slate-600 disabled:opacity-50"
          :disabled="busy || disabled"
          :aria-label="`${entry.file.name}を一覧から外す`"
          @click="remove(entry)"
        >
          外す
        </button>
      </li>
    </ul>
    <button
      v-if="entries.length"
      type="button"
      class="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50 sm:w-auto"
      :disabled="disabled || busy || !pending"
      @click="start"
    >
      {{
        busy
          ? "アップロード中…"
          : entries.some((e) => e.status === "error")
            ? "未完了の画像を再送信"
            : "アップロード"
      }}
    </button>
  </section>
</template>
