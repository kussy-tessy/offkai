<template>
  <div
    class="group relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-200">
    <!-- アクセントバー -->
    <div class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-400 to-sky-500 rounded-l-xl" />

    <div class="pl-5 pr-4 py-4">
      <div class="flex flex-col gap-3">
        <!-- 情報エリア -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base font-bold text-gray-900 leading-snug">{{ event.title }}</h3>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5">
              <FontAwesomeIcon :icon="faCalendar" class="text-gray-400 text-xs shrink-0" />
              <span class="text-xs text-gray-500 font-medium">{{ format(event.eventDate, false) }}</span>
            </div>
            <p v-if="event.description" class="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
              {{ event.description }}
            </p>
          </div>
        </div>

        <!-- アクションエリア -->
        <div class="flex items-center justify-end gap-2 flex-wrap">
          <MyButton v-if="event.canEdit" size="sm" color="primary" variant="ghost"
            @click="router.push(`/offkai/${event.id}/edit`)">
            <FontAwesomeIcon :icon="faPenToSquare" class="mr-1" />
            編集する
          </MyButton>
          <MyButton size="sm" color="secondary" variant="ghost" @click="router.push(`/offkai/${event.id}/detail`)">
            <FontAwesomeIcon :icon="faClipboardList" class="mr-1" />
            回答一覧
          </MyButton>
          <MyButton size="sm" color="primary" @click="router.push(`/offkai/${event.id}/join`)">
            <FontAwesomeIcon :icon="faPen" class="mr-1" />
            回答する
          </MyButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { faCalendar, faClipboardList, faPen, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { format, type OffkaiEventSummary, type Unbrand } from "@offkai/core";
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";

  const { event } = defineProps<{
    event: Unbrand<OffkaiEventSummary>;
  }>();

  const router = useRouter();
</script>
