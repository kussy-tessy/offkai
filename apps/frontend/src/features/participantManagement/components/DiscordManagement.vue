<template>
  <section class="space-y-4">
    <p v-if="roleName" class="text-sm text-slate-600">
      Discordロール：<span class="font-semibold text-slate-800">{{ roleName }}</span>
    </p>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">
      読み込み中…
    </div>

    <div v-else-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ loadError }}
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
            <th class="w-36 p-3 text-center">ロール割り当て</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.userId" class="odd:bg-white even:bg-slate-50/70">
            <td class="border-b border-slate-100 p-3 font-medium text-slate-700">
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
                <span v-if="member.discordUsername">{{ member.discordUsername }}</span>
                <span v-else class="text-slate-400">未連携</span>
              </div>
              <p v-if="member.unavailableReason" class="mt-1 text-xs text-rose-600">
                {{ unavailableReasonLabel(member.unavailableReason) }}
              </p>
            </td>
            <td class="border-b border-slate-100 p-3 text-center">
              <MyAsyncCheckbox
                :value="member.hasRole"
                :disabled="!member.canManageRole"
                :save="value => saveRole(member.userId, value)"
                @change="value => updateMemberRole(member.userId, value)"
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
    UpdateOffkaiEventDiscordRoleMemberResponse,
  } from "@offkai/core";
  import { computed, onMounted, ref } from "vue";
  import MyAsyncCheckbox from "@/common/components/MyAsyncCheckbox.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

  const { eventId } = defineProps<{
    eventId: string;
  }>();

  type Member = GetOffkaiEventDiscordRoleMembersResponse["members"][number];

  const { get, put } = useApi();
  const { error, success } = useToast();
  const loading = ref(true);
  const loadError = ref("");
  const data = ref<GetOffkaiEventDiscordRoleMembersResponse | null>(null);

  const members = computed(() => data.value?.members ?? []);
  const roleName = computed(() => data.value?.role.name ?? "");

  const fetchMembers = async () => {
    loading.value = true;
    loadError.value = "";
    try {
      data.value = await get<GetOffkaiEventDiscordRoleMembersResponse>(
        `/offkai-event/${eventId}/discord-role-members`,
      );
    } catch (cause) {
      loadError.value = getApiErrorMessage(cause, "Discord管理情報の読み込みに失敗しました。");
    } finally {
      loading.value = false;
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
      members: data.value.members.map((member): Member =>
        member.userId === userId ? { ...member, hasRole } : member,
      ),
    };
    success("Discordロールを更新しました。");
  };

  const onSaveError = (cause: unknown) => {
    error(getApiErrorMessage(cause, "Discordロールの更新に失敗しました。"));
  };

  const unavailableReasonLabel = (reason: DiscordRoleMemberUnavailableReason) => {
    if (reason === "DISCORD_NOT_CONNECTED") return "DiscordユーザーIDが未登録です";
    return "このユーザーはどのDiscordサーバーにも見つかりません";
  };

  onMounted(fetchMembers);
</script>
