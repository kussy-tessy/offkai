<template>
  <main class="space-y-6">
    <MyBackLink :to="`/offkai/${id}/detail`">回答一覧へ戻る</MyBackLink>

    <header>
      <h1 class="text-3xl font-bold tracking-tight">参加者管理</h1>
    </header>

    <RouteTabs label="参加者管理メニュー" :items="tabs" variant="equal" />
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import MyBackLink from "@/common/components/MyBackLink.vue";
import RouteTabs from "@/common/components/RouteTabs.vue";
import { createParticipantManagementTabs } from "@/features/participantManagement/navigation/participantManagementTabs";

const { id } = defineProps<{
  id: string;
}>();

const tabs = createParticipantManagementTabs(id);
</script>
