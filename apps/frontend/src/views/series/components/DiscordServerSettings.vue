<template>
  <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">Discordサーバー</h2>
      <p class="mt-1 text-sm text-slate-600">
        オフ会シリーズで使用するDiscordサーバーのIDを設定します。
      </p>
    </div>

    <div v-if="loading" class="py-6 text-center text-sm text-slate-400">読み込み中…</div>

    <template v-else>
      <div>
        <label for="discord-guild-id" class="mb-1 block text-sm font-medium text-slate-700">
          DiscordサーバーID
        </label>
        <input
          id="discord-guild-id"
          v-model.trim="discordGuildId"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          placeholder="例: 123456789012345678"
          :disabled="!editing || saving"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        />
        <p v-if="discordGuildIdError" class="mt-1 text-sm text-red-600">{{ discordGuildIdError }}</p>
        <p v-else-if="editing" class="mt-1 text-xs text-slate-500">空欄で保存すると設定を解除します。</p>
      </div>

      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-950">
        <input
          v-model="editing"
          type="checkbox"
          :disabled="saving"
          class="mt-0.5 h-4 w-4 shrink-0 accent-red-700"
          @change="handleEditingChange"
        />
        <span>
          <span class="block text-sm font-semibold">影響を理解した上でDiscordサーバーIDを変更する</span>
          <span class="mt-1 block text-xs leading-5 text-red-800">
            変更すると、Discordロール管理やサーバー限定公開が正しく動作しなくなる可能性があります。
          </span>
        </span>
      </label>

      <div class="flex justify-end">
        <MyButton
          color="primary"
          :loading="saving"
          :disabled="!editing || !hasChanges || saving"
          @click="requestSave"
        >
          Discord設定を保存する
        </MyButton>
      </div>
    </template>

    <MyConfirmDialog
      v-model:open="confirmRemovalOpen"
      title="Discordサーバー設定を解除しますか？"
      message="Discordロール管理やサーバー限定公開が利用できなくなります。この影響を確認した上で解除してください。"
      confirm-label="設定を解除する"
      confirm-color="red"
      :loading="saving"
      @confirm="save"
    />
  </section>
</template>

<script setup lang="ts">
  import type { GetSeriesSettingsResponse, UpdateSeriesSettingsRequest } from "@offkai/core";
  import { DiscordGuildIdSchema } from "@offkai/core";
  import { computed, onMounted, ref } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

  const { get, put } = useApi();
  const { success, error } = useToast();
  const loading = ref(true);
  const saving = ref(false);
  const editing = ref(false);
  const savedDiscordGuildId = ref("");
  const discordGuildId = ref("");
  const discordGuildIdError = ref("");
  const confirmRemovalOpen = ref(false);
  const hasChanges = computed(() => discordGuildId.value !== savedDiscordGuildId.value);

  onMounted(async () => {
    try {
      const settings = await get<GetSeriesSettingsResponse>("/series/my/settings");
      savedDiscordGuildId.value = settings?.discordGuildId ?? "";
      discordGuildId.value = savedDiscordGuildId.value;
    } catch (cause) {
      error(getApiErrorMessage(cause, "シリーズ設定の読み込みに失敗しました。"));
    } finally {
      loading.value = false;
    }
  });

  const handleEditingChange = () => {
    discordGuildIdError.value = "";
    if (!editing.value) {
      discordGuildId.value = savedDiscordGuildId.value;
    }
  };

  const requestSave = () => {
    discordGuildIdError.value = "";
    if (discordGuildId.value && !/^\d{17,20}$/.test(discordGuildId.value)) {
      discordGuildIdError.value = "17〜20桁のDiscordサーバーIDを入力してください。";
      return;
    }
    if (!discordGuildId.value && savedDiscordGuildId.value) {
      confirmRemovalOpen.value = true;
      return;
    }
    void save();
  };

  const save = async () => {
    const payload: UpdateSeriesSettingsRequest = {
      discordGuildId: discordGuildId.value
        ? DiscordGuildIdSchema.parse(discordGuildId.value)
        : null,
    };
    saving.value = true;
    try {
      await put("/series/my/settings", payload);
      savedDiscordGuildId.value = discordGuildId.value;
      editing.value = false;
      confirmRemovalOpen.value = false;
      success("Discordサーバー設定を保存しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "Discordサーバー設定の保存に失敗しました。"));
    } finally {
      saving.value = false;
    }
  };
</script>
