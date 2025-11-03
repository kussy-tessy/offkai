<template>
  <main>
    <h1>Offkai Frontend</h1>
    <p>バックエンドからのレスポンス：</p>
    <pre>{{ message }}</pre>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const message = ref<string>("(読み込み中…)");

onMounted(async () => {
  try {
    const res = await fetch("http://localhost:3000/api/hello");
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    message.value = JSON.stringify(data, null, 2);
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
