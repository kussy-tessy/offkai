<template>
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <template v-if="editing">
      <h3 class="font-semibold text-slate-900">投稿内容を編集</h3>
      <p class="mt-1 truncate text-xs text-sky-700" :title="share.url">{{ share.url }}</p>

      <form class="mt-3 space-y-2" @submit.prevent="submitEdit">
        <PhotoShareMetadataFields :form="editForm" compact />

        <div class="flex justify-end gap-2">
          <MyButton
            type="button"
            size="sm"
            color="gray"
            variant="ghost"
            :disabled="savingEdit"
            @click="cancelEdit"
          >
            キャンセル
          </MyButton>
          <MyButton type="submit" size="sm" :loading="savingEdit" :disabled="savingEdit">
            保存する
          </MyButton>
        </div>
      </form>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-slate-500">
            <span class="text-sm font-medium text-slate-900">{{ share.uploader.displayName }}さん</span>
            <span class="mx-1">·</span>
            {{ format(share.createdAt) }}
          </p>
          <a
            :href="share.url"
            :title="share.url"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
          >
            <span class="truncate">{{ share.url }}</span>
            <FontAwesomeIcon :icon="faArrowUpRightFromSquare" class="shrink-0 text-xs" />
          </a>
        </div>

        <div v-if="share.canEdit" class="flex shrink-0 gap-0.5">
          <MyIconButton
            label="投稿を編集する"
            color="secondary"
            variant="ghost"
            size="sm"
            :on-click="startEdit"
          >
            <FontAwesomeIcon :icon="faPen" />
          </MyIconButton>
          <MyIconButton
            label="投稿を削除する"
            color="red"
            variant="ghost"
            size="sm"
            :on-click="openDeleteDialog"
          >
            <FontAwesomeIcon :icon="faTrash" />
          </MyIconButton>
        </div>
      </div>

      <dl
        v-if="share.downloadDeadline || share.password || share.note"
        class="mt-2 grid gap-x-4 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs sm:grid-cols-2"
      >
        <div v-if="share.downloadDeadline" class="flex min-w-0 items-baseline gap-1.5">
          <dt class="shrink-0 font-medium text-slate-500">ダウンロード期日</dt>
          <dd class="min-w-0 whitespace-pre-wrap text-slate-800">{{ share.downloadDeadline }}</dd>
        </div>
        <div v-if="share.password" class="flex min-w-0 items-baseline gap-1.5">
          <dt class="shrink-0 font-medium text-slate-500">PASS</dt>
          <dd class="min-w-0 break-all font-mono text-slate-800">{{ share.password }}</dd>
        </div>
        <div v-if="share.note" class="flex min-w-0 items-baseline gap-1.5 sm:col-span-2">
          <dt class="shrink-0 font-medium text-slate-500">備考</dt>
          <dd class="min-w-0 whitespace-pre-wrap break-words text-slate-800">{{ share.note }}</dd>
        </div>
      </dl>

      <div class="mt-2 flex justify-end">
        <MyAsyncCheckbox
          :value="share.downloadedByMe"
          :save="saveDownloadStatus"
          :disabled="savingDownloadStatus"
          @change="changeDownloadStatus"
          @error="handleDownloadStatusError"
        >
          ダウンロード済み
        </MyAsyncCheckbox>
      </div>
    </template>
  </article>

  <MyConfirmDialog
    v-model:open="confirmDeleteOpen"
    title="写真共有を削除しますか？"
    message="この投稿のダウンロード済み記録も削除されます。この操作は元に戻せません。"
    confirm-label="削除する"
    confirm-color="red"
    :loading="deleting"
    @confirm="deleteShare"
  />
</template>

<script setup lang="ts">
  import {
    faArrowUpRightFromSquare,
    faPen,
    faTrash,
  } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import {
    format,
    type Unbrand,
    type UpdatePhotoDownloadStatusResponse,
    UpdatePhotoShareRequestSchema,
    type UpdatePhotoShareResponse,
  } from "@offkai/core";
  import { ref } from "vue";
  import MyAsyncCheckbox from "@/common/components/MyAsyncCheckbox.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
  import MyIconButton from "@/common/components/MyIconButton.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
  import { usePhotoShareForm } from "../composables";
  import type { PhotoShare } from "../types";
  import PhotoShareMetadataFields from "./PhotoShareMetadataFields.vue";

  const props = defineProps<{
    eventId: string;
    share: PhotoShare;
    editing: boolean;
    onEditStart: () => void;
    onEditCancel: () => void;
    onUpdated: (share: PhotoShare) => void;
    onDeleted: (shareId: string) => void;
  }>();

  const {
    put: updateShare,
    loading: savingEdit,
    error: updateShareError,
  } = useApi();
  const {
    del: requestDeleteShare,
    loading: deleting,
    error: deleteShareError,
  } = useApi();
  const {
    put: updateDownloadStatus,
    loading: savingDownloadStatus,
    error: downloadStatusError,
  } = useApi();
  const { success, error: showError } = useToast();
  const editForm = usePhotoShareForm();
  const confirmDeleteOpen = ref(false);

  const startEdit = () => {
    editForm.initialize({
      downloadDeadline: props.share.downloadDeadline ?? "",
      password: props.share.password ?? "",
      note: props.share.note ?? "",
    });
    props.onEditStart();
  };

  const cancelEdit = () => {
    editForm.reset();
    props.onEditCancel();
  };

  const submitEdit = async () => {
    editForm.resetErrors();
    const parsed = UpdatePhotoShareRequestSchema.safeParse({
      eventId: props.eventId,
      photoShareId: props.share.id,
      ...editForm.toMetadataPayload(),
    });
    if (!parsed.success) {
      editForm.applyValidationIssues(parsed.error.issues);
      return;
    }

    try {
      const { eventId: _, photoShareId: __, ...body } = parsed.data;
      const updated = await updateShare<Unbrand<UpdatePhotoShareResponse>>(
        `/offkai-event/${props.eventId}/photo-shares/${props.share.id}`,
        body,
      );
      if (!updated) return;

      props.onUpdated(updated);
      cancelEdit();
      success("投稿内容を更新しました。");
    } catch {
      showError(getApiErrorMessage(updateShareError.value, "投稿内容の更新に失敗しました。"));
    }
  };

  const openDeleteDialog = () => {
    confirmDeleteOpen.value = true;
  };

  const deleteShare = async () => {
    if (deleting.value) return;

    try {
      await requestDeleteShare(`/offkai-event/${props.eventId}/photo-shares/${props.share.id}`);
      confirmDeleteOpen.value = false;
      props.onDeleted(props.share.id);
      success("投稿を削除しました。");
    } catch {
      showError(getApiErrorMessage(deleteShareError.value, "投稿の削除に失敗しました。"));
    }
  };

  const saveDownloadStatus = async (downloaded: boolean) => {
    const response = await updateDownloadStatus<Unbrand<UpdatePhotoDownloadStatusResponse>>(
      `/offkai-event/${props.eventId}/photo-shares/${props.share.id}/download-status`,
      { downloaded },
    );
    if (response?.ok !== true) {
      throw new Error("Unexpected download status response");
    }
  };

  const changeDownloadStatus = (downloaded: boolean) => {
    props.onUpdated({ ...props.share, downloadedByMe: downloaded });
  };

  const handleDownloadStatusError = (cause: unknown) => {
    showError(getApiErrorMessage(downloadStatusError.value ?? cause, "ダウンロード状態の更新に失敗しました。"));
  };

</script>
