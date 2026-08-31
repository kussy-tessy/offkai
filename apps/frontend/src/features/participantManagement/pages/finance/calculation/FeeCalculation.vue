<template>
  <section class="space-y-8">
    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">
      参加費情報を読み込み中…
    </div>
    <div
      v-else-if="loadError"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      <p>{{ loadError }}</p>
      <MyButton
        class="mt-3"
        size="sm"
        color="gray"
        variant="ghost"
        @click="load"
        >再読み込み</MyButton
      >
    </div>

    <template v-else-if="finance">
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
        :class="
          finance.feeCalculationLockedAt
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        "
      >
        <div>
          <p
            class="font-semibold"
            :class="
              finance.feeCalculationLockedAt
                ? 'text-emerald-800'
                : 'text-amber-800'
            "
          >
            {{
              finance.feeCalculationLockedAt
                ? "参加費は確定済みです"
                : "参加費は編集中です"
            }}
          </p>
          <p class="mt-0.5 text-xs text-slate-600">
            {{
              finance.feeCalculationLockedAt
                ? `${format(finance.feeCalculationLockedAt)}に確定。請求内容は変更できません。`
                : "内容を確認したら参加費を確定してください。確定後に徴収できます。"
            }}
          </p>
        </div>
        <MyButton
          v-if="canConfirm && !finance.feeCalculationLockedAt"
          size="sm"
          :disabled="saving !== null"
          @click="lockDialogOpen = true"
          >参加費を確定</MyButton
        >
        <MyButton
          v-else-if="canConfirm && !finance.collectionStartedAt"
          size="sm"
          color="gray"
          variant="ghost"
          :disabled="saving !== null"
          @click="unlockDialogOpen = true"
          >確定を解除</MyButton
        >
        <span v-else-if="finance.collectionStartedAt" class="text-xs font-medium text-emerald-800"
          >徴収開始済み・解除不可</span
        >
      </div>

      <SettlementCategorySection
        :finance="finance"
        :saving-action="saving"
        :save-category="saveCategory"
        :delete-category="deleteCategory"
        :sync-members="syncMembers"
        :readonly="!canEdit"
      />
      <ParticipantChargeSection
        :finance="finance"
        :saving-action="saving"
        :save-member="saveMember"
        :add-extra="addExtra"
        :remove-extra="removeExtra"
        :save-note="saveNote"
        :readonly="!canEdit"
      />
    </template>

    <MyConfirmDialog
      v-model:open="lockDialogOpen"
      title="参加費を確定しますか？"
      message="確定後は、精算区分・所属・個別金額・追加請求・備考を変更できません。徴収を始める前であれば確定解除できます。"
      confirm-label="参加費を確定"
      :loading="saving === 'lock'"
      @confirm="lockFeeCalculation"
    />
    <MyConfirmDialog
      v-model:open="unlockDialogOpen"
      title="参加費の確定を解除しますか？"
      message="徴収済みの参加者が一人でもいる場合は解除できません。"
      confirm-label="確定を解除"
      confirm-color="red"
      :loading="saving === 'unlock'"
      @confirm="unlockFeeCalculation"
    />
  </section>
</template>

<script setup lang="ts">
import {
  format,
  type SyncSettlementCategoryMembersResponse,
  type Unbrand,
} from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
import { useEventStaffAccess } from "@/features/participantManagement/composables/useEventStaffAccess";
import ParticipantChargeSection from "./ParticipantChargeSection.vue";
import SettlementCategorySection from "./SettlementCategorySection.vue";
import type {
  ExtraChargeInput,
  Finance,
  SettlementCategoryInput,
} from "./types";

const { eventId } = defineProps<{ eventId: string }>();
const { get, post, put, del } = useApi();
const toast = useToast();
const basePath = `/offkai-event/${eventId}/finance`;
const loading = ref(true);
const loadError = ref("");
const finance = ref<Finance | null>(null);
const saving = ref<string | null>(null);
const { isOwner, permissions, loadAccess } = useEventStaffAccess(eventId);
const canEdit = computed(() => isOwner.value || permissions.value?.feeCalculation === "edit" || permissions.value?.feeCalculation === "confirm");
const canConfirm = computed(() => isOwner.value || permissions.value?.feeCalculation === "confirm");
const lockDialogOpen = ref(false);
const unlockDialogOpen = ref(false);

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await get<Finance>(basePath);
    if (!result) throw new Error();
    finance.value = result;
  } catch (cause) {
    loadError.value = getApiErrorMessage(
      cause,
      "参加費情報の読み込みに失敗しました。",
    );
  } finally {
    loading.value = false;
  }
};
const replaceFinance = (result: Finance | null, message: string) => {
  if (!result) throw new Error("更新結果を取得できませんでした。");
  finance.value = result;
  toast.success(message);
};
const fail = (cause: unknown, message: string) => {
  toast.error(getApiErrorMessage(cause, message));
};
const saveCategory = async (
  input: SettlementCategoryInput,
  categoryId: string | null,
) => {
  if (saving.value) return false;
  saving.value = "category";
  try {
    const result = categoryId
      ? await put<Finance>(
          `${basePath}/settlement-categories/${categoryId}`,
          input,
        )
      : await post<Finance>(`${basePath}/settlement-categories`, input);
    replaceFinance(
      result,
      categoryId ? "精算区分を更新しました。" : "精算区分を追加しました。",
    );
    return true;
  } catch (cause) {
    fail(cause, "精算区分を保存できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const deleteCategory = async (categoryId: string) => {
  if (saving.value) return false;
  saving.value = "delete";
  try {
    await del(`${basePath}/settlement-categories/${categoryId}`);
    await load();
    toast.success("精算区分を削除しました。");
    return true;
  } catch (cause) {
    fail(cause, "精算区分を削除できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const syncMembers = async () => {
  if (saving.value || !finance.value) return false;
  saving.value = "sync";
  try {
    let added = 0;
    let removed = 0;
    let reset = 0;
    for (const category of finance.value.categories) {
      if (!category.commitmentQuestionId) continue;
      const result = await post<Unbrand<SyncSettlementCategoryMembersResponse>>(
        `${basePath}/settlement-categories/${category.id}/sync-members`,
      );
      if (result) {
        added += result.addedCount;
        removed += result.removedCount;
        reset += result.resetOverrideCount;
      }
    }
    await load();
    toast.success(
      `割当を更新しました（追加${added}、解除${removed}、個別金額リセット${reset}）。`,
    );
    return true;
  } catch (cause) {
    fail(cause, "割当を更新できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const saveMember = async (
  userId: string,
  categoryId: string,
  included: boolean,
  amountOverride: number | null,
) => {
  if (saving.value) return false;
  saving.value = `member:${categoryId}`;
  const path = `${basePath}/settlement-categories/${categoryId}/members/${userId}`;
  try {
    const result = included
      ? await put<Finance>(path, { amountOverride })
      : await del<Finance>(path);
    replaceFinance(
      result,
      included ? "区分を更新しました。" : "区分から外しました。",
    );
    return true;
  } catch (cause) {
    fail(cause, "区分を更新できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const addExtra = async (userId: string, input: ExtraChargeInput) => {
  if (saving.value) return false;
  saving.value = "extra";
  try {
    replaceFinance(
      await post<Finance>(
        `${basePath}/participants/${userId}/extra-charges`,
        input,
      ),
      "個別追加請求を追加しました。",
    );
    return true;
  } catch (cause) {
    fail(cause, "個別追加請求を追加できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const removeExtra = async (userId: string, extraChargeId: string) => {
  if (saving.value) return false;
  saving.value = "remove-extra";
  try {
    replaceFinance(
      await del<Finance>(
        `${basePath}/participants/${userId}/extra-charges/${extraChargeId}`,
      ),
      "個別追加請求を削除しました。",
    );
    return true;
  } catch (cause) {
    fail(cause, "個別追加請求を削除できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const saveNote = async (userId: string, note: string | null) => {
  if (saving.value) return false;
  saving.value = "note";
  try {
    replaceFinance(
      await put<Finance>(`${basePath}/participants/${userId}/note`, { note }),
      "備考を保存しました。",
    );
    return true;
  } catch (cause) {
    fail(cause, "備考を保存できませんでした。");
    return false;
  } finally {
    saving.value = null;
  }
};
const lockFeeCalculation = async () => {
  if (saving.value) return;
  saving.value = "lock";
  try {
    replaceFinance(
      await post<Finance>(`${basePath}/fee-calculation-lock`),
      "参加費を確定しました。",
    );
    lockDialogOpen.value = false;
  } catch (cause) {
    fail(cause, "参加費を確定できませんでした。");
  } finally {
    saving.value = null;
  }
};
const unlockFeeCalculation = async () => {
  if (saving.value) return;
  saving.value = "unlock";
  try {
    replaceFinance(
      await del<Finance>(`${basePath}/fee-calculation-lock`),
      "参加費の確定を解除しました。",
    );
    unlockDialogOpen.value = false;
  } catch (cause) {
    fail(cause, "参加費の確定を解除できませんでした。");
  } finally {
    saving.value = null;
  }
};

onMounted(() => void Promise.all([load(), loadAccess()]));
</script>
