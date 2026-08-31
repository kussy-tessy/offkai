<template>
  <section class="space-y-5">
    <header>
      <h2 class="text-xl font-bold text-slate-900">経費精算</h2>
      <p class="mt-1 text-sm text-slate-600">
        区分ごとの経費と協力金を入力し、参加者ごとの切り捨て前返金を確認します。
      </p>
    </header>
    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">
      経費精算情報を読み込み中…
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
    <template v-else-if="page">
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
        :class="
          page.settlementLockedAt
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        "
      >
        <div>
          <p class="font-semibold" :class="page.settlementLockedAt ? 'text-emerald-800' : 'text-amber-800'">
            {{ page.settlementLockedAt ? "経費精算は確定済みです" : "経費精算は編集中です" }}
          </p>
          <p class="mt-0.5 text-xs text-slate-600">
            {{
              page.settlementLockedAt
                ? `${format(page.settlementLockedAt)}に確定。精算内容は変更できません。`
                : "内容を確認したら経費精算を確定してください。確定後に返金できます。"
            }}
          </p>
        </div>
        <MyButton
          v-if="canConfirm && !page.settlementLockedAt"
          size="sm"
          :disabled="saving !== null || !page.feeCalculationLockedAt"
          @click="lockDialogOpen = true"
          >経費精算を確定</MyButton
        >
        <MyButton
          v-else-if="canConfirm && !page.refundStartedAt"
          size="sm"
          color="gray"
          variant="ghost"
          :disabled="saving !== null"
          @click="unlockDialogOpen = true"
          >確定を解除</MyButton
        >
        <span v-else-if="page.refundStartedAt" class="text-xs font-medium text-emerald-800"
          >返金開始済み・解除不可</span
        >
      </div>
      <div
        v-if="!page.feeCalculationLockedAt"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
      >
        <strong>参加費は未確定です。</strong>
        現在の区分金額と所属に基づく試算を表示しています。経費は入力できます。
      </div>
      <div
        v-if="page.refundStartedAt"
        class="rounded-lg border border-slate-300 bg-slate-100 px-3 py-3 text-sm text-slate-700"
      >
        返金を開始したため、収入・経費・協力金は変更できません。
      </div>
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        個別追加請求はこの経費精算には含まれません。必要な返金はシステム外で対応してください。
      </div>
      <label class="block text-sm text-slate-600">
        返金額の切り捨て単位
        <select
          :value="page.refundRoundingUnit"
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base disabled:bg-slate-100 disabled:text-slate-500 sm:w-48"
          :disabled="!canConfirm || page.settlementLockedAt !== null || saving !== null"
          @change="updateRoundingUnit"
        >
          <option :value="10">10円単位</option>
          <option :value="100">100円単位</option>
          <option :value="500">500円単位</option>
        </select>
      </label>
      <div
        v-if="page.categories.length === 0"
        class="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500"
      >
        精算区分がありません。先に参加費計算で区分を作成してください。
      </div>
      <div v-else class="space-y-4">
        <SettlementCategoryPanel
          v-for="(category, index) in page.categories"
          :key="category.id"
          :category="category"
          :participants="page.participants"
          :initially-open="index === 0"
          :saving-action="saving"
          :locked="!canEdit || page.settlementLockedAt !== null"
          :save-expense="saveExpense"
          :delete-expense="deleteExpense"
          :save-income="saveIncome"
          :delete-income="deleteIncome"
        />
      </div>
    </template>
    <MyConfirmDialog
      v-model:open="lockDialogOpen"
      title="経費精算を確定しますか？"
      message="確定時の内容で参加者ごとの返金額を保存します。返金を始める前であれば確定解除できます。"
      confirm-label="経費精算を確定"
      :loading="saving === 'lock'"
      @confirm="lockSettlement"
    />
    <MyConfirmDialog
      v-model:open="unlockDialogOpen"
      title="経費精算の確定を解除しますか？"
      message="保存済みの返金額はクリアされ、経費・収入を再び編集できるようになります。"
      confirm-label="確定を解除"
      confirm-color="red"
      :loading="saving === 'unlock'"
      @confirm="unlockSettlement"
    />
  </section>
</template>

<script setup lang="ts">
import { format } from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
import { useEventStaffAccess } from "@/features/participantManagement/composables/useEventStaffAccess";
import SettlementCategoryPanel from "./SettlementCategoryPanel.vue";
import type {
  SettlementExpenseInput,
  SettlementIncomeInput,
  SettlementPage,
} from "./types";

const { eventId } = defineProps<{ eventId: string }>();
const { get, post, put, del } = useApi();
const toast = useToast();
const basePath = `/offkai-event/${eventId}/finance`;
const page = ref<SettlementPage | null>(null);
const loading = ref(true);
const loadError = ref("");
const saving = ref<string | null>(null);
const lockDialogOpen = ref(false);
const unlockDialogOpen = ref(false);
const { isOwner, permissions, loadAccess } = useEventStaffAccess(eventId);
const canEdit = computed(() => isOwner.value || permissions.value?.settlement === "edit" || permissions.value?.settlement === "confirm");
const canConfirm = computed(() => isOwner.value || permissions.value?.settlement === "confirm");

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await get<SettlementPage>(`${basePath}/settlement`);
    if (!result) throw new Error();
    page.value = result;
  } catch (cause) {
    loadError.value = getApiErrorMessage(
      cause,
      "経費精算情報を読み込めませんでした。",
    );
  } finally {
    loading.value = false;
  }
};
const saveExpense = async (
  input: SettlementExpenseInput,
  expenseId: string | null,
) => {
  if (saving.value) return false;
  saving.value = "save-expense";
  try {
    const result = expenseId
      ? await put<SettlementPage>(
          `${basePath}/settlement-expenses/${expenseId}`,
          input,
        )
      : await post<SettlementPage>(`${basePath}/settlement-expenses`, input);
    if (!result) throw new Error();
    page.value = result;
    toast.success(expenseId ? "経費を更新しました。" : "経費を追加しました。");
    return true;
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "経費を保存できませんでした。"));
    return false;
  } finally {
    saving.value = null;
  }
};
const deleteExpense = async (expenseId: string) => {
  if (saving.value) return false;
  saving.value = "delete-expense";
  try {
    await del(`${basePath}/settlement-expenses/${expenseId}`);
    const result = await get<SettlementPage>(`${basePath}/settlement`);
    if (!result) throw new Error();
    page.value = result;
    toast.success("経費を削除しました。");
    return true;
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "経費を削除できませんでした。"));
    return false;
  } finally {
    saving.value = null;
  }
};
const saveIncome = async (
  input: SettlementIncomeInput,
  incomeId: string | null,
) => {
  if (saving.value) return false;
  saving.value = "save-income";
  try {
    const result = incomeId
      ? await put<SettlementPage>(
          `${basePath}/settlement-incomes/${incomeId}`,
          input,
        )
      : await post<SettlementPage>(`${basePath}/settlement-incomes`, input);
    if (!result) throw new Error();
    page.value = result;
    toast.success(incomeId ? "収入を更新しました。" : "収入を追加しました。");
    return true;
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "収入を保存できませんでした。"));
    return false;
  } finally {
    saving.value = null;
  }
};
const deleteIncome = async (incomeId: string) => {
  if (saving.value) return false;
  saving.value = "delete-income";
  try {
    await del(`${basePath}/settlement-incomes/${incomeId}`);
    const result = await get<SettlementPage>(`${basePath}/settlement`);
    if (!result) throw new Error();
    page.value = result;
    toast.success("収入を削除しました。");
    return true;
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "収入を削除できませんでした。"));
    return false;
  } finally {
    saving.value = null;
  }
};

const lockSettlement = async () => {
  if (saving.value) return;
  saving.value = "lock";
  try {
    const result = await post<SettlementPage>(`${basePath}/settlement/lock`);
    if (!result) throw new Error();
    page.value = result;
    lockDialogOpen.value = false;
    toast.success("経費精算を確定しました。");
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "経費精算を確定できませんでした。"));
  } finally {
    saving.value = null;
  }
};

const unlockSettlement = async () => {
  if (saving.value) return;
  saving.value = "unlock";
  try {
    const result = await del<SettlementPage>(`${basePath}/settlement/lock`);
    if (!result) throw new Error();
    page.value = result;
    unlockDialogOpen.value = false;
    toast.success("経費精算の確定を解除しました。");
  } catch (cause) {
    toast.error(
      getApiErrorMessage(cause, "経費精算の確定を解除できませんでした。"),
    );
  } finally {
    saving.value = null;
  }
};

const updateRoundingUnit = async (event: Event) => {
  if (!page.value || saving.value) return;
  const select = event.target as HTMLSelectElement;
  const previousUnit = page.value.refundRoundingUnit;
  const refundRoundingUnit = Number(select.value) as SettlementPage["refundRoundingUnit"];
  if (refundRoundingUnit === previousUnit) return;
  saving.value = "settings";
  try {
    await put(`${basePath}/settings`, { refundRoundingUnit });
    const result = await get<SettlementPage>(`${basePath}/settlement`);
    if (!result) throw new Error();
    page.value = result;
    toast.success("切り捨て単位を変更しました。");
  } catch (cause) {
    select.value = String(previousUnit);
    toast.error(getApiErrorMessage(cause, "切り捨て単位を変更できませんでした。"));
  } finally {
    saving.value = null;
  }
};

onMounted(() => void Promise.all([load(), loadAccess()]));
</script>
