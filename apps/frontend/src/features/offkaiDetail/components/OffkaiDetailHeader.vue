<template>
  <header class="mb-8 space-y-6">
    <h1 class="text-center text-4xl font-bold tracking-tight">{{ offkai.title }}</h1>
    <RouteTabs label="オフ会コンテンツ" :items="contentTabs" variant="equal" />
  </header>
</template>

<script setup lang="ts">
import { faCircleInfo, faClipboardList, faImages } from "@fortawesome/free-solid-svg-icons";
import type { OffkaiDetail, Unbrand } from "@offkai/core";
import { computed } from "vue";
import type { RouteTabItem } from "@/common/components/RouteTabs.types";
import RouteTabs from "@/common/components/RouteTabs.vue";

const props = defineProps<{
  offkai: Unbrand<OffkaiDetail>["offkai"];
  hasAnswered: boolean;
}>();

const contentTabs = computed<RouteTabItem[]>(() => [
  { label: "概要", to: `/offkai/${props.offkai.id}/overview`, icon: faCircleInfo },
  { label: "回答一覧", to: `/offkai/${props.offkai.id}/answers`, icon: faClipboardList },
  ...(props.hasAnswered
    ? [{ label: "写真共有", to: `/offkai/${props.offkai.id}/photos`, icon: faImages }]
    : []),
]);
</script>
