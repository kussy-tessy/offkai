<template>
  <section class="space-y-6">
    <div class="space-y-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
      <h2 class="text-lg font-semibold text-slate-800">Discordロール設定</h2>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <MyFormField v-slot="{ id }" class="min-w-0 flex-1" label="参加者に割り当てるロール">
          <div class="flex items-center gap-2">
            <MySelectBox class="min-w-0 flex-1" :id="id" :value="selectedRoleId" :options="roleOptions"
              :on-change="onRoleChange"
              :disabled="!canManage || loadingConfiguration || savingConfiguration" />
            <div class="h-5 w-5 shrink-0">
              <div v-if="savingConfiguration"
                class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600" role="status"
                aria-label="Discordロール設定を更新中" />
            </div>
          </div>
        </MyFormField>
        <MyButton color="gray" variant="ghost" class="whitespace-nowrap"
          :disabled="!canManage || loadingConfiguration || savingConfiguration" @click="createDialogOpen = true">
          ＋ チャンネル・ロールを作成
        </MyButton>
      </div>
      <p v-if="configurationError" class="text-sm text-rose-700">
        {{ configurationError }}
      </p>
    </div>

    <DiscordChannelRoleCreateDialog v-model:open="createDialogOpen" :event-id="eventId" :roles="discordRoles"
      :selected-role-id="selectedRoleId" @created="onChannelRoleCreated" />

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">
      読み込み中…
    </div>

    <div v-else-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ loadError }}
    </div>

    <div v-else-if="!currentRoleId" class="py-12 text-center text-sm text-gray-400">
      Discordロールを設定すると、参加者への割り当てを管理できます
    </div>

    <div v-else-if="members.length === 0" class="py-12 text-center text-sm text-gray-400">
      回答者はいません
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-teal-100 shadow-sm">
      <table class="w-full table-fixed border-collapse">
        <thead class="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50">
          <tr>
            <th class="w-32 p-3 text-left">名前</th>
            <th class="p-3 text-left">Discord ID</th>
            <th class="w-20 px-1 py-3 text-center sm:w-36 sm:p-3">ロール割り当て</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.userId" class="odd:bg-white even:bg-slate-50/70">
            <td class="border-b border-slate-100 p-3 font-medium text-slate-700">
              {{ member.displayName }}
            </td>
            <td class="border-b border-slate-100 p-3 text-sm text-slate-600">
              <div class="flex min-w-0 items-center gap-2">
                <DiscordAvatar :avatar-url="member.discordAvatarUrl"
                  :display-name="member.discordUsername ?? member.displayName" size="sm" />
                <span v-if="member.discordUsername" class="truncate">{{
                  member.discordUsername
                  }}</span>
                <span v-else class="text-slate-400">未連携</span>
              </div>
              <p v-if="member.unavailableReason" class="mt-1 text-xs text-rose-600">
                {{ unavailableReasonLabel(member.unavailableReason) }}
              </p>
            </td>
            <td class="border-b border-slate-100 px-1 py-3 text-center sm:p-3">
              <MyAsyncCheckbox :value="member.hasRole" :disabled="!canAssign || !member.canManageRole"
                :save="(value) => saveRole(member.userId, value)"
                @change="(value) => updateMemberRole(member.userId, value)" @error="onSaveError" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type {
    CreateDiscordChannelRoleResponse,
    DiscordRoleMemberUnavailableReason,
    GetOffkaiEventDiscordRoleMembersResponse,
    GetOffkaiEventDiscordRoleResponse,
    UpdateOffkaiEventDiscordRoleMemberResponse,
    UpdateOffkaiEventDiscordRoleResponse,
  } from "@offkai/core";
  import { computed, onMounted, ref } from "vue";
  import DiscordAvatar from "@/common/components/DiscordAvatar.vue";
  import MyAsyncCheckbox from "@/common/components/MyAsyncCheckbox.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MySelectBox, {
    type SelectOption,
  } from "@/common/components/MySelectBox.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
  import DiscordChannelRoleCreateDialog from "@/features/participantManagement/components/DiscordChannelRoleCreateDialog.vue";
  import { useEventStaffAccess } from "@/features/participantManagement/composables/useEventStaffAccess";

  const { eventId } = defineProps<{
    eventId: string;
  }>();

  type Member = GetOffkaiEventDiscordRoleMembersResponse["members"][number];

  const { get, put } = useApi();
  const { error, success } = useToast();
  const loadingConfiguration = ref(true);
  const savingConfiguration = ref(false);
  const { isOwner, permissions, loadAccess } = useEventStaffAccess(eventId);
  const canAssign = computed(() => isOwner.value || permissions.value?.discordRole === "assign" || permissions.value?.discordRole === "manage");
  const canManage = computed(() => isOwner.value || permissions.value?.discordRole === "manage");
  const configurationError = ref("");
  const createDialogOpen = ref(false);
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
    const roleId = String(value);
    selectedRoleId.value = roleId;
    void saveConfiguration(roleId);
  };

  const onChannelRoleCreated = (result: CreateDiscordChannelRoleResponse) => {
    if (!discordRoles.value.some((role) => role.id === result.role.id)) {
      discordRoles.value = [...discordRoles.value, result.role];
    }
    selectedRoleId.value = result.role.id;
    void saveConfiguration(
      result.role.id,
      "Discordにチャンネルとロールを作成し、このオフ会に設定しました。",
    );
  };

  const saveConfiguration = async (
    roleId: string,
    successMessage = "Discordロール設定を更新しました。",
  ) => {
    savingConfiguration.value = true;
    configurationError.value = "";
    try {
      const result = await put<UpdateOffkaiEventDiscordRoleResponse>(
        `/offkai-event/${eventId}/discord-role`,
        { discordRoleId: roleId || null },
      );
      if (!result) throw new Error("Discordロール設定の更新結果が空です。");
      currentRoleId.value = result.discordRoleId ?? "";
      selectedRoleId.value = currentRoleId.value;
      success(successMessage);
      await fetchMembers();
    } catch (cause) {
      selectedRoleId.value = currentRoleId.value;
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
    await loadAccess();
    await fetchConfiguration();
    await fetchMembers();
  });
</script>
