<template>
  <header :class="compact ? 'mb-4' : 'mb-8'" class="space-y-6">
    <h1 class="text-center text-4xl font-bold tracking-tight">{{ offkai.title }}</h1>
    <RouteTabs label="オフ会コンテンツ" :items="contentTabs" variant="equal" />
  </header>
</template>

<script setup lang="ts">
import { faCircleInfo, faClipboardList, faImages, faUserGear, faUsers } from "@fortawesome/free-solid-svg-icons";
import type { OffkaiDetail, Unbrand } from "@offkai/core";
import { computed } from "vue";
import type { RouteTabItem } from "@/common/components/RouteTabs.types";
import RouteTabs from "@/common/components/RouteTabs.vue";

const props = defineProps<{
  offkai: Unbrand<OffkaiDetail>["offkai"];
  hasAnswered: boolean;
  canViewParticipantGuide: boolean;
  canManageParticipants: boolean;
  compact?: boolean;
}>();

const contentTabs = computed<RouteTabItem[]>(() => [
  { label: "概要", to: `/offkai/${props.offkai.id}/overview`, icon: faCircleInfo },
  ...(props.canViewParticipantGuide
    ? [{ label: "参加者向け情報", to: `/offkai/${props.offkai.id}/participant-guide`, icon: faClipboardList }]
    : []),
  { label: "参加者一覧", to: `/offkai/${props.offkai.id}/answers`, icon: faUsers },
  ...(props.hasAnswered
    ? [{ label: "写真共有", to: `/offkai/${props.offkai.id}/photos`, icon: faImages }]
    : []),
  ...(props.canManageParticipants
    ? [{
        label: "参加者管理",
        to: `/offkai/${props.offkai.id}/participant-management`,
        icon: faUserGear,
        exact: false,
      }]
    : []),
]);
</script>
