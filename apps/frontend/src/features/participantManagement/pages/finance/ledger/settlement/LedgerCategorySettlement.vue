<template>
  <section class="card space-y-4 !rounded-2xl !border-teal-100 shadow-sm">
    <div
      class="sticky top-0 z-20 -mx-4 !-mt-4 bg-teal-50 px-4 py-3 border-b border-teal-100 rounded-t-2xl flex flex-wrap items-center justify-between gap-2"
    >
      <h3 class="font-bold text-teal-900">{{ title }}</h3>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="order-2 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-semibold">支出</h4>
          <MyButton
            v-if="categoryId && can('settlement', 'edit')"
            :disabled="!editable"
            type="button"
            size="sm"
            variant="ghost"
            color="gray"
            aria-label="支出を追加"
            title="支出を追加"
            @click="open('expenses')"
            ><FontAwesomeIcon :icon="faPlus"
          /></MyButton>
        </div>
        <p
          v-if="!expenses.length"
          class="caption"
        >
          まだ登録されていません。
        </p>
        <div
          v-for="expense in expenses"
          :key="expense.id"
          class="border-t py-3 first:border-t-0"
        >
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="flex justify-between gap-3">
                <span>{{ expense.title }}</span>
                <strong class="whitespace-nowrap">{{
                  yen(expense.amount)
                }}</strong>
              </p>
              <p class="caption">{{ expenseStatus(expense) }}</p>
              <div
                v-if="expense.kind === 'cooperation'"
                class="mt-2 flex flex-wrap items-center gap-1.5"
              >
                <MyBadge
                  v-for="recipient in expense.recipients"
                  :key="recipient.personId"
                  size="sm"
                  color="gray"
                >
                  {{ name(recipient.personId) }}
                </MyBadge>
              </div>
              <p
                v-if="expense.note"
                class="caption"
              >
                {{ expense.note }}
              </p>
            </div>
            <EditorButtons
              :label="expense.title"
              @edit="emit('edit', 'expenses', expense)"
              @remove="emit('remove', 'expenses', expense.id, expense.title)"
            />
          </div>
        </div>
        <p class="flex justify-between border-t pt-3">
          <span>支出合計</span><strong>{{ yen(expenseTotal) }}</strong>
        </p>
      </div>

      <div
        v-if="categoryId"
        class="order-1 rounded-xl border border-sky-100 bg-sky-50/40 p-4"
      >
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-semibold">収入</h4>
          <MyButton
            v-if="can('settlement', 'edit')"
            :disabled="!editable"
            type="button"
            size="sm"
            variant="ghost"
            color="gray"
            aria-label="収入を追加"
            title="収入を追加"
            @click="open('incomes')"
            ><FontAwesomeIcon :icon="faPlus"
          /></MyButton>
        </div>
        <div class="py-3">
          <p class="flex justify-between">
            <span>参加費</span><strong>{{ yen(feeTotal) }}</strong>
          </p>
          <p class="caption">徴収済み {{ yen(feeReceived) }}</p>
        </div>
        <p
          v-if="!incomes.length && !feeTotal"
          class="caption"
        >
          まだ登録されていません。
        </p>
        <div
          v-for="income in incomes"
          :key="income.id"
          class="border-t py-3 first:border-t-0"
        >
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="flex justify-between gap-3">
                <span>{{ income.title }}</span>
                <strong class="whitespace-nowrap">{{
                  yen(income.amount)
                }}</strong>
              </p>
              <p class="caption">実績 {{ yen(paid("income", income.id)) }}</p>
              <p
                v-if="income.note"
                class="caption"
              >
                {{ income.note }}
              </p>
            </div>
            <EditorButtons
              :label="income.title"
              @edit="emit('edit', 'incomes', income)"
              @remove="emit('remove', 'incomes', income.id, income.title)"
            />
          </div>
          <MyButton
            v-if="
              can('settlement', 'edit') &&
              paid('income', income.id) < income.amount
            "
            class="mt-2"
            :disabled="!editable"
            type="button"
            size="sm"
            @click="emit('payment', 'income', income.id)"
          >
            残り{{ yen(income.amount - paid("income", income.id)) }}を受け取る
          </MyButton>
        </div>
        <div class="border-t pt-3">
          <p class="flex justify-between">
            <span>収入合計（見込）</span
            ><strong>{{ yen(feeTotal + incomeTotal) }}</strong>
          </p>
          <p class="caption text-right">
            実績
            {{
              yen(
                feeReceived +
                  incomes.reduce((sum, i) => sum + paid("income", i.id), 0),
              )
            }}
          </p>
        </div>
      </div>
    </div>
    <p
      v-if="categoryId"
      class="flex justify-between border-t pt-3 font-semibold"
    >
      <span>収支差額（見込）</span
      ><span>{{ yen(feeTotal + incomeTotal - expenseTotal) }}</span>
    </p>
  </section>
</template>

<script setup lang="ts">
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import type { FinanceLedger, LedgerPage } from "@offkai/core";
import { computed } from "vue";
import EditorButtons from "./SettlementEntryActions.vue";
import MyBadge from "@/common/components/MyBadge.vue";
import MyButton from "@/common/components/MyButton.vue";
import { yen } from "../utils/ledger-display";
import type { LedgerPanelEvents } from "../types/ledger-panel-events";
import { useLedgerSession } from "../composables/useLedgerSession";

const props = defineProps<{
  page: LedgerPage;
  categoryId: string | null;
  title: string;
}>();
const emit = defineEmits<
  LedgerPanelEvents & {
    payment: [kind: "expense" | "income", referenceId: string];
  }
>();
const { editable, can } = useLedgerSession();
const expenses = computed(() =>
  props.page.state.expenses.filter((row) =>
    props.categoryId
      ? row.categoryId === props.categoryId && row.kind !== "independent"
      : row.kind === "independent",
  ),
);
const incomes = computed(() =>
  props.page.state.incomes.filter((row) => row.categoryId === props.categoryId),
);
const fees = computed(() =>
  props.page.calculation.charges.filter(
    (c) => c.categoryId === props.categoryId,
  ),
);
const feeTotal = computed(() =>
  fees.value.reduce((sum, c) => sum + c.amount, 0),
);
const feeReceived = computed(() =>
  fees.value.reduce((sum, c) => sum + c.received, 0),
);
const incomeTotal = computed(() =>
  incomes.value.reduce((sum, c) => sum + c.amount, 0),
);
const expenseTotal = computed(() =>
  expenses.value.reduce((sum, c) => sum + c.amount, 0),
);
const name = (id: string) =>
  props.page.state.people.find((person) => person.id === id)?.name ?? id;
const paid = (kind: "expense" | "income", referenceId: string) =>
  props.page.state.payments
    .filter(
      (payment) => payment.kind === kind && payment.referenceId === referenceId,
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
function open(resource: "expenses" | "incomes" | "items") {
  emit("edit", resource, undefined, undefined, props.categoryId);
}
function expenseStatus(expense: FinanceLedger["expenses"][number]) {
  if (expense.payerId)
    return `${name(expense.payerId)}が立替済み・本人への精算に含む`;
  if (expense.kind === "cooperation") return "協力金・受取人への精算に含む";
  return "";
}
</script>

<style scoped src="../styles/ledger-workspace.css"></style>
