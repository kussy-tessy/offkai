<template>
  <div
    class="group relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-200">
    <RouterLink
      :to="`/offkai/${event.id}/detail`"
      class="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
      :aria-label="`${event.title}の回答一覧を表示する`"
    />

    <!-- アクセントバー -->
    <div class="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-400 to-sky-500 rounded-l-xl" />

    <div class="relative z-0 pointer-events-none pl-5 pr-4 py-4">
      <div class="flex flex-col gap-3">
        <!-- 情報エリア -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-1.5">
              <h3 class="text-base font-bold text-gray-900 leading-snug">{{ event.title }}</h3>
              <button
                v-if="event.canEdit"
                type="button"
                class="relative z-10 pointer-events-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="オフ会を削除する"
                @click="confirmDeleteOpen = true"
              >
                <FontAwesomeIcon :icon="faTrash" class="text-xs" />
              </button>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5">
              <FontAwesomeIcon :icon="faCalendar" class="text-gray-400 text-xs shrink-0" />
              <span class="text-xs text-gray-500 font-medium">{{ formatPeriodWithDay(event.eventPeriod) }}</span>
            </div>
            <p v-if="event.description" class="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
              {{ event.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <MyConfirmDialog
    v-model:open="confirmDeleteOpen"
    title="オフ会を削除しますか？"
    :message="`「${event.title}」を削除します。回答データも削除され、この操作は元に戻せません。`"
    confirm-label="削除する"
    confirm-color="red"
    :loading="deleting"
    @confirm="deleteEvent"
  />
</template>

<script setup lang="ts">
  import { faCalendar, faTrash } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { formatPeriodWithDay, type OffkaiEventSummary, type Unbrand } from "@offkai/core";
  import { ref } from "vue";
  import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

  const { event } = defineProps<{
    event: Unbrand<OffkaiEventSummary>;
  }>();
  const emit = defineEmits<{
    deleted: [eventId: string];
  }>();

  const { del } = useApi();
  const { success, error } = useToast();
  const confirmDeleteOpen = ref(false);
  const deleting = ref(false);

  const deleteEvent = async () => {
    if (deleting.value) return;
    deleting.value = true;
    try {
      await del(`/offkai-event/${event.id}`);
      success("オフ会を削除しました。");
      confirmDeleteOpen.value = false;
      emit("deleted", event.id);
    } catch (cause) {
      error(getApiErrorMessage(cause, "オフ会の削除に失敗しました。"));
    } finally {
      deleting.value = false;
    }
  };
</script>
