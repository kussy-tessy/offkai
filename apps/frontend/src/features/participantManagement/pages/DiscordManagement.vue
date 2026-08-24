<template>
  <section class="space-y-6">
    <div class="space-y-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
      <h2 class="text-lg font-semibold text-slate-800">Discordロール設定</h2>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <MyFormField
          v-slot="{ id }"
          class="min-w-0 flex-1"
          label="参加者に割り当てるロール"
        >
          <MySelectBox
            :id="id"
            :value="selectedRoleId"
            :options="roleOptions"
            :on-change="onRoleChange"
            :disabled="loadingConfiguration || savingConfiguration"
          />
        </MyFormField>
        <MyButton
          class="border border-transparent"
          :disabled="
            loadingConfiguration ||
            savingConfiguration ||
            selectedRoleId === currentRoleId
          "
          :loading="savingConfiguration"
          @click="saveConfiguration"
        >
          保存
        </MyButton>
      </div>
      <p v-if="configurationError" class="text-sm text-rose-700">
        {{ configurationError }}
      </p>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">
      読み込み中…
    </div>

    <div
      v-else-if="loadError"
      class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      {{ loadError }}
    </div>

    <div
      v-else-if="!currentRoleId"
      class="py-12 text-center text-sm text-gray-400"
    >
      Discordロールを設定すると、参加者への割り当てを管理できます
    </div>

    <div
      v-else-if="members.length === 0"
      class="py-12 text-center text-sm text-gray-400"
    >
      回答者はいません
    </div>

    <div
      v-else
      class="overflow-hidden rounded-xl border border-teal-100 shadow-sm"
    >
      <table class="w-full table-fixed border-collapse">
        <thead
          class="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50"
        >
          <tr>
            <th class="w-32 p-3 text-left">名前</th>
            <th class="p-3 text-left">Discord ID</th>
            <th class="w-36 p-3 text-center">ロール割り当て</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.userId"
            class="odd:bg-white even:bg-slate-50/70"
          >
            <td
              class="border-b border-slate-100 p-3 font-medium text-slate-700"
            >
              {{ member.displayName }}
            </td>
            <td class="border-b border-slate-100 p-3 text-sm text-slate-600">
              <div class="flex items-center gap-2">
                <img
                  v-if="member.discordAvatarUrl"
                  :src="member.discordAvatarUrl"
                  alt=""
                  class="h-6 w-6 rounded-full"
                  loading="lazy"
                />
                <span v-if="member.discordUsername">{{
                  member.discordUsername
                }}</span>
                <span v-else class="text-slate-400">未連携</span>
              </div>
              <p
                v-if="member.unavailableReason"
                class="mt-1 text-xs text-rose-600"
              >
                {{ unavailableReasonLabel(member.unavailableReason) }}
              </p>
            </td>
            <td class="border-b border-slate-100 p-3 text-center">
              <MyAsyncCheckbox
                :value="member.hasRole"
                :disabled="!member.canManageRole"
                :save="(value) => saveRole(member.userId, value)"
                @change="(value) => updateMemberRole(member.userId, value)"
                @error="onSaveError"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  DiscordRoleMemberUnavailableReason,
  GetOffkaiEventDiscordRoleMembersResponse,
  GetOffkaiEventDiscordRoleResponse,
  UpdateOffkaiEventDiscordRoleMemberResponse,
  UpdateOffkaiEventDiscordRoleResponse,
} from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import MyAsyncCheckbox from "@/common/components/MyAsyncCheckbox.vue";
import MyButton from "@/common/components/MyButton.vue";
import MyFormField from "@/common/components/MyFormField.vue";
import MySelectBox, {
  type SelectOption,
} from "@/common/components/MySelectBox.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

const { eventId } = defineProps<{
  eventId: string;
}>();

type Member = GetOffkaiEventDiscordRoleMembersResponse["members"][number];

const { get, put } = useApi();
const { error, success } = useToast();
const loadingConfiguration = ref(true);
const savingConfiguration = ref(false);
const configurationError = ref("");
const selectedRoleId = ref("");
const currentRoleId = ref("");
const discordRoles = ref<GetOffkaiEventDiscordRoleResponse["roles"]>([]);
const loading = ref(false);
const loadError = ref("");
const data = ref<GetOffkaiEventDiscordRoleMembersResponse | null>(null);

const members = computed(() => data.value?.members ?? []);
const roleOptions = computed<SelectOption[]>(() => [
  { value: "", label: "未設定" },
  ...discordRoles.value.map((role) => ({ value: role.id, label: role.name })),
]);

const fetchConfiguration = async () => {
  loadingConfiguration.value = true;
  configurationError.value = "";
  try {
    const configuration = await get<GetOffkaiEventDiscordRoleResponse>(
      `/offkai-event/${eventId}/discord-role`,
    );
    if (!configuration) {
      throw new Error("Discordロール設定の取得結果が空です。");
    }
    currentRoleId.value = configuration.discordRoleId ?? "";
    selectedRoleId.value = currentRoleId.value;
    discordRoles.value = configuration.roles;
  } catch (cause) {
    configurationError.value = getApiErrorMessage(
      cause,
      "Discordロール設定の読み込みに失敗しました。",
    );
  } finally {
    loadingConfiguration.value = false;
  }
};

const fetchMembers = async () => {
  data.value = null;
  loadError.value = "";
  if (!currentRoleId.value) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    data.value = await get<GetOffkaiEventDiscordRoleMembersResponse>(
      `/offkai-event/${eventId}/discord-role-members`,
    );
  } catch (cause) {
    loadError.value = getApiErrorMessage(
      cause,
      "Discord管理情報の読み込みに失敗しました。",
    );
  } finally {
    loading.value = false;
  }
};

const onRoleChange = (value: string | number) => {
  selectedRoleId.value = String(value);
};

const saveConfiguration = async () => {
  savingConfiguration.value = true;
  configurationError.value = "";
  try {
    const result = await put<UpdateOffkaiEventDiscordRoleResponse>(
      `/offkai-event/${eventId}/discord-role`,
      { discordRoleId: selectedRoleId.value || null },
    );
    if (!result) throw new Error("Discordロール設定の更新結果が空です。");
    currentRoleId.value = result.discordRoleId ?? "";
    selectedRoleId.value = currentRoleId.value;
    success("Discordロール設定を更新しました。");
    await fetchMembers();
  } catch (cause) {
    configurationError.value = getApiErrorMessage(
      cause,
      "Discordロール設定の更新に失敗しました。",
    );
  } finally {
    savingConfiguration.value = false;
  }
};

const saveRole = async (userId: string, hasRole: boolean) => {
  await put<UpdateOffkaiEventDiscordRoleMemberResponse>(
    `/offkai-event/${eventId}/discord-role-members/${userId}`,
    { hasRole },
  );
};

const updateMemberRole = (userId: string, hasRole: boolean) => {
  if (!data.value) return;
  data.value = {
    ...data.value,
    members: data.value.members.map(
      (member): Member =>
        member.userId === userId ? { ...member, hasRole } : member,
    ),
  };
  success("Discordロールを更新しました。");
};

const onSaveError = (cause: unknown) => {
  error(getApiErrorMessage(cause, "Discordロールの更新に失敗しました。"));
};

const unavailableReasonLabel = (reason: DiscordRoleMemberUnavailableReason) => {
  if (reason === "DISCORD_NOT_CONNECTED")
    return "DiscordユーザーIDが未登録です";
  return "このユーザーはどのDiscordサーバーにも見つかりません";
};

onMounted(async () => {
  await fetchConfiguration();
  await fetchMembers();
});
</script>
