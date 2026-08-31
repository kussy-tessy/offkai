<template>
  <main class="space-y-8">
    <div>
      <h1 class="text-3xl">オフ会シリーズの設定</h1>
      <p class="mt-2 text-sm text-gray-600">
        シリーズで共通して利用する設定を管理します。この画面はシリーズのownerだけが利用できます。
      </p>
    </div>

    <DiscordServerSettings />

    <StaffManagementSettings />

    <StaffPermissionsSettings />

    <section class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">オフ会テンプレート</h2>
          <p class="mt-1 text-sm text-slate-600">
            新しいオフ会で使用する質問テンプレートを管理します。
          </p>
        </div>
        <MyButton class="shrink-0" color="secondary" @click="router.push('/series/question-template')">
          設定画面を開く
        </MyButton>
    </section>
  </main>
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import DiscordServerSettings from "./components/DiscordServerSettings.vue";
  import StaffManagementSettings from "./components/StaffManagementSettings.vue";
  import StaffPermissionsSettings from "./components/StaffPermissionsSettings.vue";

  const router = useRouter();
</script>
