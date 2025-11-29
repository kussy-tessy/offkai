<template>
  <main>
    <h1>Offkai Frontend</h1>
    <p>バックエンドからのレスポンス：</p>
    <pre>{{ message }}</pre>
  </main>
</template>

<script setup lang="ts">
import { useApi } from "@/common/composables";
import { ref, onMounted } from "vue";

const message = ref<string>("(読み込み中…)");

const api = useApi();

onMounted(async () => {
  try {
    const res = await api.get('hello');
    message.value = JSON.stringify(res!.data);
  } catch (err) {
    message.value = `エラー: ${(err as Error).message}`;
  }
});
</script>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  padding: 2rem;
}
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
