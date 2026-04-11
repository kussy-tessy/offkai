<template>
  <main class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">ダッシュボード</h1>
      <MyButton color="primary" @click="router.push('/offkai/create')">
        オフ会を作成する
      </MyButton>
    </div>

    <section>
      <h2 class="text-lg font-semibold mb-3">参加・作成したオフ会</h2>

      <div v-if="loading" class="text-gray-400 text-sm py-8 text-center">
        読み込み中…
      </div>
      <div
        v-else-if="events.length === 0"
        class="text-gray-500 text-sm py-12 text-center border rounded-lg"
      >
        参加または作成したオフ会がまだありません。
      </div>
      <div v-else class="space-y-3">
        <OffkaiEventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import MyButton from "@/common/components/MyButton.vue";
import { useMyOffkaiEvents } from "../composables/useMyOffkaiEvents";
import OffkaiEventCard from "./OffkaiEventCard.vue";

const router = useRouter();
const { events, loading } = useMyOffkaiEvents();
</script>
