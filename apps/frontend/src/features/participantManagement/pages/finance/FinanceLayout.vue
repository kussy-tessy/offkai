<template>
  <section class="space-y-5">
    <RouteTabs v-if="tabs.length" label="参加費管理メニュー" :items="tabs" variant="equal" />
    <RouterView />
  </section>
</template>

<script setup lang="ts">
import type { OffkaiDetail, Unbrand } from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import RouteTabs from "@/common/components/RouteTabs.vue";
import { useApi } from "@/common/composables";
import { createFinanceTabs } from "@/features/participantManagement/navigation/financeTabs";

const { eventId } = defineProps<{ eventId: string }>();
const { get } = useApi();
const detail = ref<Unbrand<OffkaiDetail> | null>(null);
const tabs = computed(() => createFinanceTabs(eventId, detail.value?.viewer.seriesRole === "owner" ? null : detail.value?.viewer.staffPermissions));
onMounted(async () => { detail.value = await get<Unbrand<OffkaiDetail>>(`/offkai-event/${eventId}/detail`); });
</script>
