<template>
  <main class="space-y-6">
    <div v-if="user?.isSeriesOwner" class="flex justify-end">
      <div class="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
        <MyButton color="secondary" variant="ghost" @click="router.push('/series/question-template')">
          テンプレート設定
        </MyButton>
        <MyButton color="primary" @click="router.push('/offkai/create')">
          オフ会を作成する
        </MyButton>
      </div>
    </div>

    <section>
      <div v-if="loading" class="text-gray-400 text-sm py-8 text-center">
        読み込み中…
      </div>
      <div v-else-if="events.length === 0" class="text-gray-500 text-sm py-12 text-center border rounded-lg">
        参加または作成したオフ会がまだありません。
      </div>
      <div v-else class="space-y-3">
        <OffkaiEventCard v-for="event in events" :key="event.id" :event="event" @deleted="removeEvent" />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import { useAuth } from "@/common/composables";
  import { useMyOffkaiEvents } from "../composables/useMyOffkaiEvents";
  import OffkaiEventCard from "./OffkaiEventCard.vue";

  const router = useRouter();
  const { user } = useAuth();
  const { events, loading } = useMyOffkaiEvents();

  const removeEvent = (eventId: string) => {
    events.value = events.value.filter((event) => event.id !== eventId);
  };
</script>
