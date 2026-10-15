<script setup lang="ts">
import { ref } from "vue";
import ParticipantGuideImages from "../../src/features/participantGuide/components/ParticipantGuideImages.vue";
const guideMode = new URLSearchParams(location.search).get("guide");
import ImageUploader from "../../src/common/components/ImageUploader.vue";
import ImageViewer from "../../src/common/components/ImageViewer.vue";
import type { ImageUploadHandler } from "../../src/common/components/ImageUploader.types";
const open = ref(false);
const mounted = ref(true);
const results = ref<string[]>([]);
const attempts = new Map<string, number>();
const upload: ImageUploadHandler = async (file, { onProgress }) => {
  const count = (attempts.get(file.name) ?? 0) + 1;
  attempts.set(file.name, count);
  onProgress(50);
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (file.name === "retry.png" && count === 1) throw new Error("test failure");
  onProgress(100);
  return file.name;
};
const src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="steelblue"/><circle cx="800" cy="600" r="300" fill="orange"/></svg>')}`;
</script>
<template>
  <main class="mx-auto max-w-xl space-y-6 p-4">
    <ParticipantGuideImages
      v-if="guideMode"
      event-id="test-event"
      :editable="guideMode === 'edit'"
    />
    <template v-else>
      <ImageUploader
        :upload="upload"
        :max-files="3"
        :max-file-size="1024"
        @uploaded="results.push(String($event.result))"
      />
      <p data-testid="results">{{ results.join(",") }}</p>
      <button @click="open = true">画像を開く</button>
      <button @click="mounted = !mounted">ビューアを切り替え</button>
      <p data-testid="open">{{ open }}</p>
      <ImageViewer
        v-if="mounted"
        v-model:open="open"
        :image="{ src, width: 1600, height: 1200, alt: 'テスト画像' }"
      />
    </template>
  </main>
</template>
