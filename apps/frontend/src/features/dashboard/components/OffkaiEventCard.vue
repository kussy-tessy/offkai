<template>
  <div
    class="group relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-200">
    <RouterLink
      :to="`/offkai/${event.id}/overview`"
      class="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
      :aria-label="`${event.title}の概要を表示する`"
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
</template>

<script setup lang="ts">
  import { faCalendar } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { formatPeriodWithDay, type OffkaiEventSummary, type Unbrand } from "@offkai/core";

  const { event } = defineProps<{
    event: Unbrand<OffkaiEventSummary>;
  }>();
</script>
