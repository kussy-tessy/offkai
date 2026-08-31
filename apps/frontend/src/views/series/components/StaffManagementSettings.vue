<template>
  <section class="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">スタッフの管理</h2>
      <p class="mt-1 text-sm text-slate-600">
        このシリーズを運営するスタッフを管理します。KigPlaにDiscord連携済みで、このシリーズのDiscordサーバーに参加しているユーザーを追加できます。
      </p>
    </div>

    <form class="flex flex-col gap-3 sm:flex-row sm:items-start" @submit.prevent="addStaff">
      <div class="min-w-0 flex-1">
        <label for="staff-discord-username" class="mb-1 block text-sm font-medium text-slate-700">
          Discord username
        </label>
        <input
          id="staff-discord-username"
          v-model.trim="discordUsername"
          type="text"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          placeholder="例: username"
          :disabled="adding"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
        />
        <p v-if="usernameError" class="mt-1 text-sm text-red-600">{{ usernameError }}</p>
      </div>
      <MyButton type="submit" class="sm:mt-6" :loading="adding" :disabled="adding || !discordUsername">
        追加する
      </MyButton>
    </form>

    <div class="border-t border-slate-200 pt-5">
      <div v-if="loading" class="py-6 text-center text-sm text-slate-400">読み込み中…</div>
      <p v-else-if="staff.length === 0" class="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        スタッフはまだ登録されていません。
      </p>
      <ul v-else class="divide-y divide-slate-200 rounded-lg border border-slate-200">
        <li v-for="member in staff" :key="member.userId" class="flex items-center justify-between gap-4 p-4">
          <div class="min-w-0">
            <p class="truncate font-medium text-slate-900">{{ member.userName }}</p>
            <p class="truncate text-sm text-slate-500">
              {{ member.discordUsername ? `@${member.discordUsername}` : "Discord未連携" }}
            </p>
          </div>
          <MyButton color="red" variant="ghost" size="sm" @click="requestRemoval(member)">
            削除
          </MyButton>
        </li>
      </ul>
    </div>

    <MyConfirmDialog
      v-model:open="confirmRemovalOpen"
      title="スタッフから削除しますか？"
      :message="removalTarget ? `${removalTarget.userName} さんをこのシリーズのスタッフから削除します。` : ''"
      confirm-label="削除する"
      confirm-color="red"
      :loading="removing"
      @confirm="removeStaff"
    />
  </section>
</template>

<script setup lang="ts">
import {
  AddSeriesStaffRequestSchema,
  type AddSeriesStaffResponse,
  type GetSeriesStaffResponse,
  type SeriesStaff,
} from "@offkai/core";
import { onMounted, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

const { get, post, del } = useApi();
const { success, error } = useToast();
const staff = ref<SeriesStaff[]>([]);
const discordUsername = ref("");
const usernameError = ref("");
const loading = ref(true);
const adding = ref(false);
const removing = ref(false);
const confirmRemovalOpen = ref(false);
const removalTarget = ref<SeriesStaff | null>(null);

onMounted(async () => {
  try {
    staff.value = (await get<GetSeriesStaffResponse>("/series/my/staff")) ?? [];
  } catch (cause) {
    error(getApiErrorMessage(cause, "スタッフ一覧を読み込めませんでした。"));
  } finally {
    loading.value = false;
  }
});

const addStaff = async () => {
  usernameError.value = "";
  const parsed = AddSeriesStaffRequestSchema.safeParse({ discordUsername: discordUsername.value });
  if (!parsed.success) {
    usernameError.value = "有効なDiscord usernameを入力してください。";
    return;
  }

  adding.value = true;
  try {
    const added = await post<AddSeriesStaffResponse>("/series/my/staff", parsed.data);
    if (added) staff.value.push(added);
    discordUsername.value = "";
    success("スタッフを追加しました。");
  } catch (cause) {
    error(getApiErrorMessage(cause, "スタッフを追加できませんでした。"));
  } finally {
    adding.value = false;
  }
};

const requestRemoval = (member: SeriesStaff) => {
  removalTarget.value = member;
  confirmRemovalOpen.value = true;
};

const removeStaff = async () => {
  const target = removalTarget.value;
  if (!target) return;
  removing.value = true;
  try {
    await del(`/series/my/staff/${target.userId}`);
    staff.value = staff.value.filter(member => member.userId !== target.userId);
    confirmRemovalOpen.value = false;
    removalTarget.value = null;
    success("スタッフを削除しました。");
  } catch (cause) {
    error(getApiErrorMessage(cause, "スタッフを削除できませんでした。"));
  } finally {
    removing.value = false;
  }
};
</script>
