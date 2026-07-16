<template>
  <div class="bg-sky-50 min-h-screen">
    <AppHeader />
    <main class="mx-auto w-full max-w-3xl py-0 sm:px-4 sm:py-8 md:py-10">
      <div class="min-h-[calc(100vh-4rem)] bg-white p-4 sm:min-h-0 sm:rounded-lg sm:border sm:p-6 md:p-8">
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
