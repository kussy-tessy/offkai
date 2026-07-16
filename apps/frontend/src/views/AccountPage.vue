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
        <form class="space-y-4" @submit.prevent="handleDiscordSubmit">
          <MyFormField label="Discord ID">
            <template #default="{ id }">
              <MyTextBox
                :id="id"
                :value="discordUsername"
                :on-change="v => discordUsername = v"
                :error="discordUsernameError"
              />
            </template>
          </MyFormField>
          <div class="flex flex-wrap gap-2">
            <MyButton type="submit" color="secondary" :loading="savingDiscord" :disabled="savingDiscord">
              Discord IDを保存する
            </MyButton>
            <MyButton
              type="button"
              color="red"
              variant="ghost"
              :loading="disconnectingDiscord"
              :disabled="disconnectingDiscord || !user?.discordUsername"
              @click="handleDiscordDisconnect"
            >
              解除する
            </MyButton>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
  import { ref, watch } from "vue";
  import MyBackLink from "@/common/components/MyBackLink.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyTextBox from "@/common/components/MyTextbox.vue";
  import { getApiErrorMessage, useAuth, useToast } from "@/common/composables";

  const { user, updateName, changePassword, connectDiscord, disconnectDiscord } = useAuth();
  const { success, error } = useToast();

  const name = ref(user.value?.name ?? "");
  const currentPassword = ref("");
  const newPassword = ref("");
  const discordUsername = ref(user.value?.discordUsername ?? "");

  const nameError = ref("");
  const currentPasswordError = ref("");
  const newPasswordError = ref("");
  const discordUsernameError = ref("");

  const savingName = ref(false);
  const savingPassword = ref(false);
  const savingDiscord = ref(false);
  const disconnectingDiscord = ref(false);

  watch(user, (value) => {
    name.value = value?.name ?? "";
    discordUsername.value = value?.discordUsername ?? "";
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

  const handleDiscordSubmit = async () => {
    discordUsernameError.value = "";
    const trimmedDiscordUsername = discordUsername.value.trim();

    if (!trimmedDiscordUsername) {
      discordUsernameError.value = "必須です";
      return;
    }

    if (!/^(?!.*\.\.)[a-z0-9._]{2,32}$/.test(trimmedDiscordUsername)) {
      discordUsernameError.value = "2〜32文字の英小文字・数字・_・.で入力してください";
      return;
    }

    savingDiscord.value = true;
    try {
      await connectDiscord(trimmedDiscordUsername);
      success("Discord IDを保存しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "Discord IDの保存に失敗しました。"));
    } finally {
      savingDiscord.value = false;
    }
  };

  const handleDiscordDisconnect = async () => {
    disconnectingDiscord.value = true;
    try {
      await disconnectDiscord();
      discordUsername.value = "";
      success("Discord連携を解除しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "Discord連携の解除に失敗しました。"));
    } finally {
      disconnectingDiscord.value = false;
    }
  };
</script>
