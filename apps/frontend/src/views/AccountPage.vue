<template>
  <main class="space-y-8">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-900">アカウント設定</h1>
      <MyBackLink to="/dashboard" />
    </div>

    <section class="border-b border-slate-200 pb-8">
      <h2 class="mb-4 text-lg font-semibold text-slate-900">表示名</h2>
      <form class="max-w-md space-y-4" @submit.prevent="handleNameSubmit">
        <MyFormField label="名前" required>
          <template #default="{ id }">
            <MyTextBox :id="id" :value="name" :on-change="v => name = v" :error="nameError" />
          </template>
        </MyFormField>
        <MyButton type="submit" color="primary" :loading="savingName" :disabled="savingName">
          名前を変更する
        </MyButton>
      </form>
    </section>

    <section class="border-b border-slate-200 pb-8">
      <h2 class="mb-4 text-lg font-semibold text-slate-900">パスワード</h2>
      <form class="max-w-md space-y-4" @submit.prevent="handlePasswordSubmit">
        <MyFormField label="現在のパスワード" required>
          <template #default="{ id }">
            <MyTextBox
              :id="id"
              type="password"
              :value="currentPassword"
              :on-change="v => currentPassword = v"
              :error="currentPasswordError"
            />
          </template>
        </MyFormField>
        <MyFormField label="新しいパスワード" required>
          <template #default="{ id }">
            <MyTextBox
              :id="id"
              type="password"
              :value="newPassword"
              :on-change="v => newPassword = v"
              :error="newPasswordError"
            />
          </template>
        </MyFormField>
        <MyButton type="submit" color="primary" :loading="savingPassword" :disabled="savingPassword">
          パスワードを変更する
        </MyButton>
      </form>
    </section>

    <section>
      <h2 class="mb-4 text-lg font-semibold text-slate-900">Discord</h2>
      <div class="max-w-md space-y-4">
        <div v-if="user?.discordUserId" class="flex items-center gap-3">
          <img
            v-if="discordProfile?.avatarUrl"
            :src="discordProfile.avatarUrl"
            :alt="`${discordProfile.username}のDiscord Avatar`"
            class="h-12 w-12 rounded-full bg-slate-100 object-cover"
            referrerpolicy="no-referrer"
          />
          <div
            v-else
            class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600"
            aria-hidden="true"
          >
            {{ (discordProfile?.username ?? user.discordUsername ?? "?").slice(0, 1).toUpperCase() }}
          </div>
          <p class="text-sm text-slate-700">
            <span class="font-medium">{{ discordProfile?.username ?? user.discordUsername }}</span>
            と連携済みです。
          </p>
        </div>
        <p v-else class="text-sm text-slate-600">
          Discordで本人確認し、アカウントを連携します。メッセージの閲覧や送信は行いません。
        </p>
        <div class="flex flex-wrap gap-2">
          <MyButton
            v-if="!user?.discordUserId"
            type="button"
            color="secondary"
            :loading="connectingDiscord"
            :disabled="connectingDiscord"
            @click="handleDiscordConnect"
          >
            Discordと連携する
          </MyButton>
          <MyButton
            v-else
            type="button"
            color="red"
            variant="ghost"
            :loading="disconnectingDiscord"
            :disabled="disconnectingDiscord"
            @click="handleDiscordDisconnect"
          >
            解除する
          </MyButton>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
  import type { GetMyDiscordProfileResponse } from "@offkai/core";
  import { onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import MyBackLink from "@/common/components/MyBackLink.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyTextBox from "@/common/components/MyTextbox.vue";
  import { getApiErrorMessage, useApi, useAuth, useToast } from "@/common/composables";

  const { user, updateName, changePassword, connectDiscord, disconnectDiscord } = useAuth();
  const { get } = useApi();
  const { success, error } = useToast();
  const route = useRoute();
  const router = useRouter();

  const name = ref(user.value?.name ?? "");
  const currentPassword = ref("");
  const newPassword = ref("");

  const nameError = ref("");
  const currentPasswordError = ref("");
  const newPasswordError = ref("");

  const savingName = ref(false);
  const savingPassword = ref(false);
  const connectingDiscord = ref(false);
  const disconnectingDiscord = ref(false);
  const discordProfile = ref<GetMyDiscordProfileResponse | null>(null);

  watch(user, (value) => {
    name.value = value?.name ?? "";
  });

  const handleNameSubmit = async () => {
    nameError.value = "";
    const trimmedName = name.value.trim();

    if (!trimmedName) {
      nameError.value = "必須です";
      return;
    }

    savingName.value = true;
    try {
      await updateName(trimmedName);
      success("名前を変更しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "名前の変更に失敗しました。"));
    } finally {
      savingName.value = false;
    }
  };

  const handlePasswordSubmit = async () => {
    currentPasswordError.value = "";
    newPasswordError.value = "";

    if (!currentPassword.value) currentPasswordError.value = "必須です";
    if (!newPassword.value) newPasswordError.value = "必須です";
    if (currentPasswordError.value || newPasswordError.value) return;

    savingPassword.value = true;
    try {
      await changePassword(currentPassword.value, newPassword.value);
      currentPassword.value = "";
      newPassword.value = "";
      success("パスワードを変更しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "パスワードの変更に失敗しました。"));
    } finally {
      savingPassword.value = false;
    }
  };

  const handleDiscordConnect = () => {
    connectingDiscord.value = true;
    connectDiscord();
  };

  const handleDiscordDisconnect = async () => {
    disconnectingDiscord.value = true;
    try {
      await disconnectDiscord();
      discordProfile.value = null;
      success("Discord連携を解除しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "Discord連携の解除に失敗しました。"));
    } finally {
      disconnectingDiscord.value = false;
    }
  };

  onMounted(() => {
    if (user.value?.discordUserId) {
      void get<GetMyDiscordProfileResponse>("/me/discord-profile")
        .then((profile) => {
          discordProfile.value = profile;
        })
        .catch(() => {
          discordProfile.value = null;
        });
    }

    const result = typeof route.query.discord === "string" ? route.query.discord : null;
    if (!result) return;

    if (result === "connected") {
      success("Discordアカウントを連携しました。");
    } else if (result === "cancelled") {
      error("Discord連携がキャンセルされました。");
    } else if (result === "conflict") {
      error("このDiscordアカウントは別のユーザーに連携されています。");
    } else if (result === "invalid_state") {
      error("Discord連携の有効期限が切れました。もう一度お試しください。");
    } else {
      error("Discord連携に失敗しました。もう一度お試しください。");
    }

    const { discord: _discord, ...query } = route.query;
    void router.replace({ query });
  });
</script>
