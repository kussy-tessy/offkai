<template>
  <div class="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold text-gray-900">{{ event.title }}</h3>
        <p class="text-sm text-gray-500 mt-0.5">開催日：{{ formatDate(event.eventDate) }}</p>
        <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ event.description }}</p>
      </div>
      <div class="flex flex-col gap-2 shrink-0">
        <MyButton size="sm" color="secondary" variant="ghost" @click="router.push(`/offkai/${event.id}/details`)">
          回答一覧
        </MyButton>
        <MyButton size="sm" color="primary" @click="router.push(`/offkai/${event.id}/join`)">
          回答する
        </MyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MyButton from "@/common/components/MyButton.vue";
import type { OffkaiEventSummary } from "../composables/useMyOffkaiEvents";

const { event } = defineProps<{
  event: OffkaiEventSummary;
}>();

const router = useRouter();

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};
</script>
