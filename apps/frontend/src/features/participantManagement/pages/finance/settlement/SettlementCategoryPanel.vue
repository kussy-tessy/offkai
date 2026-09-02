<template>
  <article
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
  >
    <button
      class="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        ><span class="font-bold text-slate-900">{{ category.name }}</span
        ><span class="ml-2 text-sm text-slate-500"
          >{{ category.memberCount }}人</span
        ></span
      >
      <span class="flex items-center gap-3"
        ><FontAwesomeIcon
          :icon="open ? faChevronUp : faChevronDown"
          class="text-slate-400"
      /></span>
    </button>
    <div v-if="open" class="space-y-6 border-t border-slate-200 p-4">
      <div
        v-if="category.commonRefundPool < 0"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
      >
        この区分は{{
          money(-category.commonRefundPool)
        }}の赤字です。追加徴収などの対応が必要です。
      </div>
      <section
        class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
      >
        <h3 class="text-lg font-bold text-slate-900">収入</h3>
        <div class="border-b border-slate-100 pb-3">
          <div class="flex items-baseline justify-between gap-3">
            <p class="font-medium text-slate-900">参加費</p>
            <p class="font-semibold tabular-nums text-slate-900">
              {{ money(category.participantFeeIncome) }}
            </p>
          </div>
          <div
            v-if="participantFeeMembers.length"
            class="mt-2 flex flex-wrap gap-1.5"
          >
            <MyBadge
              v-for="member in participantFeeMembers"
              :key="member.userId"
              size="sm"
              variant="custom"
              class="border-amber-200 bg-amber-50 text-amber-800"
            >
              {{ member.displayName }}
            </MyBadge>
          </div>
        </div>
        <MyButton
          v-if="!locked && !editingIncome && !creatingIncome"
          class="justify-start"
          size="sm"
          color="gray"
          variant="ghost"
          @click="creatingIncome = true"
        >
          ＋ その他の収入を追加
        </MyButton>
        <div v-if="category.incomes.length" class="divide-y divide-slate-100">
          <div
            v-for="income in category.incomes"
            :key="income.id"
            class="flex items-start justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="font-medium text-slate-900">{{ income.title }}</p>
              <p
                v-if="income.note"
                class="mt-1 truncate text-xs text-slate-500"
              >
                {{ income.note }}
              </p>
            </div>
            <div class="flex shrink-0 items-center">
              <span class="mr-1 font-semibold tabular-nums text-slate-900">{{
                money(income.amount)
              }}</span>
              <button
                v-if="!locked"
                class="rounded p-2 text-teal-700 hover:bg-teal-50"
                title="編集"
                @click="startEditIncome(income)"
              >
                <FontAwesomeIcon :icon="faPen" />
              </button>
              <button
                v-if="!locked"
                class="rounded p-2 text-rose-600 hover:bg-rose-50"
                title="削除"
                @click="requestDeleteIncome(income)"
              >
                <FontAwesomeIcon :icon="faTrash" />
              </button>
            </div>
          </div>
        </div>
        <SettlementIncomeForm
          v-if="creatingIncome || editingIncome"
          :key="editingIncome?.id ?? 'new-income'"
          :category-id="category.id"
          :income="editingIncome"
          :saving="savingAction !== null"
          :save="saveIncome"
          :on-cancel="closeIncomeForm"
        />
        <div
          class="flex items-baseline justify-between border-t border-slate-300 pt-3"
        >
          <span class="font-semibold text-slate-700">合計</span>
          <span class="text-lg font-bold tabular-nums text-slate-900">{{
            money(category.totalIncome)
          }}</span>
        </div>
      </section>

      <section
        class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-bold text-slate-900">支出</h3>
          <MyButton
            v-if="!locked && !editingExpense && !creating"
            size="sm"
            color="gray"
            variant="ghost"
            @click="creating = true"
            >＋ 支出を追加</MyButton
          >
        </div>
        <div
          v-if="category.expenses.length === 0 && !creating"
          class="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400"
        >
          経費はまだありません。
        </div>
        <div
          v-else-if="category.expenses.length"
          class="divide-y divide-slate-100"
        >
          <div
            v-for="expense in category.expenses"
            :key="expense.id"
            class="flex items-start justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="font-medium text-slate-900">{{ expense.title }}</p>
              <div
                v-if="expense.recipients.length"
                class="mt-2 flex flex-wrap items-center gap-1.5"
              >
                <MyBadge
                  v-for="recipient in expense.recipients"
                  :key="recipient.userId"
                  size="sm"
                  variant="custom"
                  class="border-amber-200 bg-amber-50 text-amber-800"
                >
                  {{ participantName(recipient.userId) }}
                </MyBadge>
                <span class="text-xs tabular-nums text-slate-500">
                  （{{ money(expense.recipients[0]?.amount ?? 0) }} ×
                  {{ expense.recipients.length }}人）
                </span>
              </div>
              <p
                v-if="expense.note"
                class="mt-1 truncate text-xs text-slate-500"
              >
                {{ expense.note }}
              </p>
            </div>
            <div class="flex shrink-0 items-center">
              <span class="mr-1 font-semibold tabular-nums text-slate-900">{{
                money(expense.amount)
              }}</span>
              <button
                v-if="!locked"
                class="rounded p-2 text-teal-700 hover:bg-teal-50"
                title="編集"
                @click="startEdit(expense)"
              >
                <FontAwesomeIcon :icon="faPen" /></button
              ><button
                v-if="!locked"
                class="rounded p-2 text-rose-600 hover:bg-rose-50"
                title="削除"
                @click="requestDelete(expense)"
              >
                <FontAwesomeIcon :icon="faTrash" />
              </button>
            </div>
          </div>
        </div>
        <SettlementExpenseForm
          v-if="creating || editingExpense"
          :key="editingExpense?.id ?? 'new'"
          :category-id="category.id"
          :expense="editingExpense"
          :participants="participants"
          :saving="savingAction !== null"
          :save="saveExpense"
          :on-cancel="closeForm"
        />
        <div
          class="flex items-baseline justify-between border-t border-slate-300 pt-3"
        >
          <span class="font-semibold text-slate-700">合計</span>
          <span class="text-lg font-bold tabular-nums text-slate-900">{{
            money(expenseTotal)
          }}</span>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-xl border border-teal-200 bg-teal-50/30"
      >
        <div class="flex items-baseline justify-between gap-3 p-4">
          <h3 class="text-lg font-bold text-slate-900">収支</h3>
          <p
            class="text-2xl font-bold tabular-nums"
            :class="
              category.commonRefundPool < 0 ? 'text-rose-700' : 'text-slate-900'
            "
          >
            {{ money(category.commonRefundPool) }}
          </p>
        </div>

        <div class="space-y-3 border-t border-teal-200 bg-white/60 p-4">
          <h3 class="text-lg font-bold text-slate-900">返金</h3>
          <p v-if="category.memberCount > 0" class="text-sm text-slate-700">
            共通返金
            <span class="font-semibold tabular-nums">{{
              money(category.commonRefundPool)
            }}</span>
            ÷ {{ category.memberCount }}人 ＝
            <span class="font-bold tabular-nums text-teal-800">{{
              decimalMoney(commonRefundPerMember)
            }}</span>
          </p>
          <p v-else class="text-sm text-slate-500">
            対象者がいないため、共通返金を計算できません。
          </p>
          <h4 class="pt-2 font-semibold text-slate-900">参加者ごと</h4>
          <div
            v-if="category.participantBreakdowns.length === 0"
            class="mt-3 text-sm text-slate-400"
          >
            表示できる参加者はいません。
          </div>
          <div
            v-else
            class="overflow-x-auto rounded-lg border border-slate-200"
          >
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th class="px-3 py-2">参加者</th>
                  <th class="px-3 py-2 text-right">共通返金</th>
                  <th class="px-3 py-2 text-right">協力金</th>
                  <th class="px-3 py-2 text-right">区分合計</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="row in category.participantBreakdowns"
                  :key="row.userId"
                >
                  <td class="px-3 py-2">
                    {{ row.displayName
                    }}<span
                      v-if="!row.isCategoryMember"
                      class="ml-1 text-xs text-slate-400"
                      >区分外</span
                    >
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums">
                    {{
                      row.commonRefund
                        ? decimalMoney(row.commonRefund.displayAmount)
                        : "算出対象外"
                    }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums">
                    {{ money(row.recipientAmount) }}
                  </td>
                  <td
                    class="px-3 py-2 text-right font-bold tabular-nums"
                    :class="
                      row.total.displayAmount < 0
                        ? 'text-rose-700'
                        : 'text-teal-800'
                    "
                  >
                    {{ decimalMoney(row.total.displayAmount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <MyConfirmDialog
      v-model:open="deleteDialogOpen"
      title="経費を削除しますか？"
      :message="deleteTarget ? `「${deleteTarget.title}」を削除します。` : ''"
      confirm-label="削除"
      confirm-color="red"
      :loading="savingAction === 'delete-expense'"
      @confirm="confirmDelete"
    />
    <MyConfirmDialog
      v-model:open="incomeDeleteDialogOpen"
      title="収入を削除しますか？"
      :message="
        incomeDeleteTarget
          ? `「${incomeDeleteTarget.title}」を削除します。`
          : ''
      "
      confirm-label="削除"
      confirm-color="red"
      :loading="savingAction === 'delete-income'"
      @confirm="confirmDeleteIncome"
    />
  </article>
</template>

<script setup lang="ts">
import {
  faChevronDown,
  faChevronUp,
  faPen,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref } from "vue";
import MyBadge from "@/common/components/MyBadge.vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import SettlementExpenseForm from "./SettlementExpenseForm.vue";
import SettlementIncomeForm from "./SettlementIncomeForm.vue";
import type {
  SettlementExpense,
  SettlementExpenseInput,
  SettlementCategoryResult,
  SettlementIncome,
  SettlementIncomeInput,
  SettlementPage,
} from "./types";

const props = defineProps<{
  category: SettlementCategoryResult;
  participants: SettlementPage["participants"];
  initiallyOpen: boolean;
  savingAction: string | null;
  locked: boolean;
  saveExpense: (
    input: SettlementExpenseInput,
    expenseId: string | null,
  ) => Promise<boolean>;
  deleteExpense: (expenseId: string) => Promise<boolean>;
  saveIncome: (
    input: SettlementIncomeInput,
    incomeId: string | null,
  ) => Promise<boolean>;
  deleteIncome: (incomeId: string) => Promise<boolean>;
}>();

const open = ref(props.initiallyOpen);
const creating = ref(false);
const editingExpense = ref<SettlementExpense | null>(null);
const deleteDialogOpen = ref(false);
const deleteTarget = ref<SettlementExpense | null>(null);
const creatingIncome = ref(false);
const editingIncome = ref<SettlementIncome | null>(null);
const incomeDeleteDialogOpen = ref(false);
const incomeDeleteTarget = ref<SettlementIncome | null>(null);
const money = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
const decimalMoney = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)}円`;
const participantName = (userId: string) =>
  props.participants.find((participant) => participant.userId === userId)
    ?.displayName ?? "不明";
const participantFeeMembers = computed(() =>
  props.category.participantBreakdowns.filter((row) => row.isCategoryMember),
);
const expenseTotal = computed(
  () =>
    props.category.normalExpenseTotal + props.category.recipientExpenseTotal,
);
const commonRefundPerMember = computed(() =>
  props.category.memberCount > 0
    ? props.category.commonRefundPool / props.category.memberCount
    : 0,
);
const startEdit = (expense: SettlementExpense) => {
  creating.value = false;
  editingExpense.value = expense;
};
const closeForm = () => {
  creating.value = false;
  editingExpense.value = null;
};
const requestDelete = (expense: SettlementExpense) => {
  deleteTarget.value = expense;
  deleteDialogOpen.value = true;
};
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  if (await props.deleteExpense(deleteTarget.value.id)) {
    deleteDialogOpen.value = false;
    deleteTarget.value = null;
  }
};
const startEditIncome = (income: SettlementIncome) => {
  creatingIncome.value = false;
  editingIncome.value = income;
};
const closeIncomeForm = () => {
  creatingIncome.value = false;
  editingIncome.value = null;
};
const requestDeleteIncome = (income: SettlementIncome) => {
  incomeDeleteTarget.value = income;
  incomeDeleteDialogOpen.value = true;
};
const confirmDeleteIncome = async () => {
  if (!incomeDeleteTarget.value) return;
  if (await props.deleteIncome(incomeDeleteTarget.value.id)) {
    incomeDeleteDialogOpen.value = false;
    incomeDeleteTarget.value = null;
  }
};
</script>
