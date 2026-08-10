<template>
  <Dashboard />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@/common/composables";
import Dashboard from "@/features/dashboard/components/Dashboard.vue";

const route = useRoute();
const router = useRouter();
const { success } = useToast();

onMounted(() => {
  if (route.query.discord !== "connected") return;
  success("Discordアカウントを連携しました。");
  const { discord: _discord, ...query } = route.query;
  void router.replace({ query });
});
</script>
