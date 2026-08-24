<template>
  <main class="mx-auto max-w-lg py-8">
    <section class="rounded-2xl border border-sky-100 bg-white p-6 text-center shadow-sm sm:p-8">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-3xl">
        💬
      </div>
      <h1 class="text-2xl font-bold text-slate-900">Discordを連携しましょう</h1>
      <p class="mt-3 text-sm leading-6 text-slate-600">
        Discordを連携すると、参加しているサーバー限定のオフ会情報を閲覧できます。
        メッセージの閲覧・送信は行いません。
      </p>

      <div class="mt-6 space-y-3">
        <MyButton
          class="w-full"
          color="secondary"
          size="lg"
          :loading="connecting"
          :disabled="connecting"
          @click="handleConnect"
        >
          Discordと連携する
        </MyButton>
        <button
          type="button"
          class="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
          @click="router.push('/dashboard')"
        >
          あとで連携する
        </button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import MyButton from "@/common/components/MyButton.vue";
  import { getApiErrorMessage, useAuth, useToast } from "@/common/composables";

  const { user, connectDiscord } = useAuth();
  const { error } = useToast();
  const route = useRoute();
  const router = useRouter();
  const connecting = ref(false);

  const handleConnect = async () => {
    connecting.value = true;
    try {
      await connectDiscord("onboarding");
    } catch (cause) {
      connecting.value = false;
      error(getApiErrorMessage(cause, "Discord連携を開始できませんでした。"));
    }
  };

  onMounted(() => {
    if (user.value?.discordUserId) {
      void router.replace("/dashboard");
      return;
    }

    const result = typeof route.query.discord === "string" ? route.query.discord : null;
    if (result === "cancelled") {
      error("Discord連携がキャンセルされました。");
    } else if (result === "conflict") {
      error("このDiscordアカウントは別のユーザーに連携されています。");
    } else if (result === "invalid_state") {
      error("Discord連携の有効期限が切れました。もう一度お試しください。");
    } else if (result) {
      error("Discord連携に失敗しました。もう一度お試しください。");
    }

    if (result) {
      void router.replace({ query: {} });
    }
  });
</script>
