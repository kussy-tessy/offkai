<template>
  <div class="bg-sky-50 min-h-screen">
    <AppHeader />
    <main class="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
      <div class="rounded-lg border bg-white p-6 md:p-8">
        <router-view />
      </div>
    </main>
    <MyToast />
  </div>
</template>

<script setup lang="ts">
  import AppHeader from "@/common/components/AppHeader.vue";
  import MyToast from "@/common/components/MyToast.vue";
</script>

<style></style>
