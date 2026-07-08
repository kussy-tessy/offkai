<template>
  <section>
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-xl font-semibold text-slate-900">共有された写真</h2>
      <span class="text-sm text-slate-500">{{ shares.length }}件</span>
    </div>

    <div
      v-if="shares.length === 0"
      class="rounded-xl border border-dashed border-slate-300 px-5 py-14 text-center text-slate-500"
    >
      <FontAwesomeIcon :icon="faImages" class="mb-3 text-4xl text-slate-300" />
      <p>まだ写真は共有されていません。</p>
    </div>

    <div v-else class="space-y-4">
      <PhotoShareCard
        v-for="share in shares"
        :key="share.id"
        :event-id="eventId"
        :share="share"
        :editing="editingId === share.id"
        :on-edit-start="() => startEdit(share.id)"
        :on-edit-cancel="cancelEdit"
        :on-updated="onUpdated"
        :on-deleted="handleDeleted"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { faImages } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { ref } from "vue";
  import type { PhotoShare } from "../types";
  import PhotoShareCard from "./PhotoShareCard.vue";

  const props = defineProps<{
    eventId: string;
    shares: PhotoShare[];
    onUpdated: (share: PhotoShare) => void;
    onDeleted: (shareId: string) => void;
  }>();

  const editingId = ref<string | null>(null);
  const { onUpdated } = props;

  const startEdit = (shareId: string) => {
    editingId.value = shareId;
  };

  const cancelEdit = () => {
    editingId.value = null;
  };

  const handleDeleted = (shareId: string) => {
    if (editingId.value === shareId) editingId.value = null;
    props.onDeleted(shareId);
  };
</script>
