<template>
  <main class="space-y-6">
    <MyBackLink :to="`/offkai/${id}/detail`">回答一覧へ戻る</MyBackLink>

    <header>
      <h1 class="text-3xl font-bold tracking-tight">参加者管理</h1>
    </header>

    <RouteTabs label="参加者管理メニュー" :items="tabs" />
    <DiscordManagement :event-id="id" />
  </main>
</template>

<script setup lang="ts">
  import { faComments } from "@fortawesome/free-solid-svg-icons";
  import MyBackLink from "@/common/components/MyBackLink.vue";
  import RouteTabs from "@/common/components/RouteTabs.vue";
  import type { RouteTabItem } from "@/common/components/RouteTabs.types";
  import DiscordManagement from "@/features/participantManagement/components/DiscordManagement.vue";

  const { id } = defineProps<{
    id: string;
  }>();

  const tabs: RouteTabItem[] = [
    {
      label: "Discord",
      to: `/offkai/${id}/participants/discord`,
      icon: faComments,
    },
  ];
</script>
