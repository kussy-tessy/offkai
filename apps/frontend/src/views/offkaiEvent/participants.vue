<template>
  <div v-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
    {{ loadError }}
  </div>
  <template v-else-if="detail">
    <OffkaiDetailHeader
      :offkai="detail.offkai"
      :has-answered="detail.viewer.isParticipant"
      :can-view-participant-guide="detail.viewer.permissions.canViewParticipantGuide"
      :can-manage-participants="canManageParticipants"
    />

    <main v-if="canManageParticipants" class="space-y-6">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">参加者管理</h1>
    </header>

    <RouteTabs label="参加者管理メニュー" :items="tabs" variant="equal" />
    <RouterView />
    </main>
    <div v-else class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      参加者を管理する権限がありません。
    </div>
  </template>
</template>

<script setup lang="ts">
import type { OffkaiDetail, Unbrand } from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import RouteTabs from "@/common/components/RouteTabs.vue";
import { getApiErrorMessage, useApi } from "@/common/composables";
import OffkaiDetailHeader from "@/features/offkaiDetail/components/OffkaiDetailHeader.vue";
import { createParticipantManagementTabs } from "@/features/participantManagement/navigation/participantManagementTabs";

const { id } = defineProps<{
  id: string;
}>();

const tabs = computed(() => {
  const viewer = detail.value?.viewer;
  const owner = viewer?.seriesRole === "owner";
  const permissions = viewer?.staffPermissions;
  return createParticipantManagementTabs(id, {
    discord: owner || permissions?.discordRole !== "none",
    finance: owner || Boolean(permissions && [permissions.feeCalculation, permissions.feeCollection, permissions.settlement, permissions.refund].some(level => level !== "none")),
    answers: owner || (viewer?.seriesRole === "staff" && viewer.isParticipant),
  });
});
const { get } = useApi();
const detail = ref<Unbrand<OffkaiDetail> | null>(null);
const loadError = ref("");
const canManageParticipants = computed(
  () =>
    detail.value?.viewer.permissions.canManageDiscordRole === true ||
    detail.value?.viewer.permissions.canManagePayments === true ||
    (detail.value?.viewer.seriesRole === "staff" && detail.value.viewer.isParticipant),
);

onMounted(async () => {
  try {
    detail.value = await get<Unbrand<OffkaiDetail>>(`/offkai-event/${id}/detail`);
  } catch (cause) {
    loadError.value = getApiErrorMessage(cause, "オフ会情報の読み込みに失敗しました。");
  }
});
</script>
