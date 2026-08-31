<template>
  <OffkaiDetailHeader
    :offkai="data.offkai"
    :has-answered="hasAnswered"
    :can-view-participant-guide="data.viewer.permissions.canViewParticipantGuide"
    :can-manage-participants="canManageParticipants"
  />

  <section class="space-y-6">
    <div v-if="showManagementActions" class="flex flex-wrap justify-center gap-2">
      <MyButton v-if="data.viewer.permissions.canEditEvent" color="secondary" variant="ghost"
        @click="router.push(`/offkai/${data.offkai.id}/edit`)">
        <FontAwesomeIcon :icon="faPenToSquare" class="mr-2" />オフ会情報を編集
      </MyButton>
      <MyButton v-if="data.viewer.permissions.canDeleteEvent" color="red" variant="ghost"
        @click="confirmDeleteOpen = true">
        <FontAwesomeIcon :icon="faTrash" class="mr-2" />削除
      </MyButton>
    </div>

    <div class="flex justify-center">
      <MyBadge :icon="faCalendar">開催日：{{ formatPeriodWithDay(data.offkai.eventPeriod) }}</MyBadge>
    </div>

    <p v-if="data.offkai.description" class="whitespace-pre-line text-gray-600">
      <LinkifiedText :text="data.offkai.description" />
    </p>

    <div class="flex flex-col items-center gap-2 border-t-2 border-teal-200 pt-6">
      <MyButton :color="canAnswer ? 'primary' : 'gray'" size="lg" :disabled="!canAnswer"
        @click="router.push(`/offkai/${data.offkai.id}/join`)">
        <FontAwesomeIcon :icon="faPen" class="mr-2" />
        {{ hasAnswered ? "参加表明を編集する" : "参加表明をする" }}
      </MyButton>
      <p v-if="!canAnswer" class="text-sm text-gray-500">
        {{ participationDeniedMessage }}
      </p>
    </div>

  </section>

  <MyConfirmDialog v-model:open="confirmDeleteOpen" title="オフ会を削除しますか？"
    :message="`「${data.offkai.title}」を削除します。回答データも削除され、この操作は元に戻せません。`"
    confirm-label="削除する" confirm-color="red" :loading="deleting" @confirm="deleteEvent" />
</template>

<script setup lang="ts">
import { faCalendar, faPen, faPenToSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { formatPeriodWithDay, formatWithDay, type OffkaiDetail, type Unbrand } from "@offkai/core";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import LinkifiedText from "@/common/components/LinkifiedText.vue";
import MyBadge from "@/common/components/MyBadge.vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
import OffkaiDetailHeader from "./OffkaiDetailHeader.vue";

const props = defineProps<{ data: Unbrand<OffkaiDetail> }>();
const router = useRouter();
const { del } = useApi();
const { success, error } = useToast();
const confirmDeleteOpen = ref(false);
const deleting = ref(false);
const hasAnswered = computed(() => props.data.viewer.isParticipant);
const canAnswer = computed(() =>
  props.data.viewer.permissions.canEditAnswers || hasAnswered.value ||
  (props.data.participationAccess.granted &&
    Date.now() >= new Date(props.data.offkai.applicationStartDate).getTime()),
);
const participationDeniedMessage = computed(() => {
  const reason = props.data.participationAccess.reason;
  if (reason === "AUTHENTICATION_REQUIRED") return "参加表明するにはログインが必要です。";
  if (reason === "DISCORD_NOT_CONNECTED") return "参加表明するにはDiscordアカウントの連携が必要です。";
  if (reason === "NOT_GUILD_MEMBER") return "このオフ会はDiscordサーバー参加者のみ参加表明できます。";
  if (reason === "MEMBERSHIP_CHECK_UNAVAILABLE") return "Discordサーバーへの所属を確認できませんでした。";
  return `募集開始前です。${formatWithDay(props.data.offkai.applicationStartDate, true)} から参加表明できます。`;
});
const canManageParticipants = computed(() =>
  props.data.viewer.permissions.canManageDiscordRole || props.data.viewer.permissions.canManagePayments,
);
const showManagementActions = computed(() =>
  props.data.viewer.permissions.canEditEvent || props.data.viewer.permissions.canDeleteEvent,
);

const deleteEvent = async () => {
  if (deleting.value) return;
  deleting.value = true;
  try {
    await del(`/offkai-event/${props.data.offkai.id}`);
    success("オフ会を削除しました。");
    confirmDeleteOpen.value = false;
    await router.push("/dashboard");
  } catch (cause) {
    error(getApiErrorMessage(cause, "オフ会の削除に失敗しました。"));
  } finally {
    deleting.value = false;
  }
};
</script>
