<template>
  <section class="space-y-5">
    <RouteTabs label="参加費管理メニュー" :items="tabs" variant="equal" />
    <RouterView />
  </section>
</template>

<script setup lang="ts">
import RouteTabs from "@/common/components/RouteTabs.vue";
import { createFinanceTabs } from "@/features/participantManagement/navigation/financeTabs";

const { eventId } = defineProps<{ eventId: string }>();
const tabs = createFinanceTabs(eventId);
</script>
