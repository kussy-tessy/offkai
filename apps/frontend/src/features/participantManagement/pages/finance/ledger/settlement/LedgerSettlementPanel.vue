<template>
  <div
    class="grid grid-cols-2 lg:grid-cols-4 gap-3"
    aria-label="イベントの収支"
  >
    <div class="card !rounded-xl !border-sky-100 !bg-sky-50/60">
      <p class="mb-1 text-base font-semibold text-slate-800">収入</p>
      <p>
        見込 <strong>{{ yen(totals.expected) }}</strong>
      </p>
      <p class="caption">実績 {{ yen(totals.received) }}</p>
    </div>
    <div class="card !rounded-xl !border-rose-100 !bg-rose-50/60">
      <p class="mb-1 text-base font-semibold text-slate-800">支出</p>
      <strong>{{ yen(totals.expenses) }}</strong>
    </div>
    <div class="card !rounded-xl !border-emerald-100 !bg-emerald-50/60">
      <p class="mb-1 text-base font-semibold text-slate-800">収支</p>
      <p>
        見込
        <strong
          :class="totals.expected - totals.expenses < 0 ? 'text-red-700' : ''"
          >{{ yen(totals.expected - totals.expenses) }}</strong
        >
      </p>
      <p class="caption">実績 {{ yen(totals.received - totals.expenses) }}</p>
    </div>
    <div class="card !rounded-xl !border-violet-100 !bg-violet-50/60">
      <p class="mb-1 text-base font-semibold text-slate-800">主催の収支</p>
      <p>
        見込
        <strong
          :class="
            finalBalance !== null && finalBalance < 0 ? 'text-red-700' : ''
          "
          >{{ yen(finalBalance) }}</strong
        >
      </p>
      <p
        v-if="finalBalance === null"
        class="caption"
      >
        未配分の明細があります
      </p>
      <p class="caption">
        実績
        <strong
          :class="
            finalBalanceActual !== null && finalBalanceActual < 0
              ? 'text-red-700'
              : ''
          "
          >{{ yen(finalBalanceActual) }}</strong
        >
      </p>
    </div>
  </div>
  <LedgerCategorySettlement
    v-for="category in page.state.categories"
    :key="category.id"
    :page="page"
    :category-id="category.id"
    :title="category.name"
    @edit="openEditor"
    @remove="remove"
    @payment="(kind, referenceId) => emit('payment', kind, referenceId)"
  />
  <LedgerCategorySettlement
    v-if="independentExpenses.length"
    :page="page"
    :category-id="null"
    title="別会計"
    @edit="openEditor"
    @remove="remove"
    @payment="(kind, referenceId) => emit('payment', kind, referenceId)"
  />
  <div
    v-if="page.calculation.unallocated.length"
    class="rounded bg-amber-50 p-3"
  >
    <strong>未配分の明細があります</strong>
    <p
      v-for="row in page.calculation.unallocated"
      :key="row.id"
    >
      {{ row.title }}：{{ yen(row.amount) }}
    </p>
    <p class="caption">
      明細の配分を設定すると、返金・追加徴収を記録できます。
    </p>
  </div>
  <div class="card !px-1 sm:!px-4 space-y-3 !rounded-2xl !border-teal-100 shadow-sm">
    <div class="flex flex-wrap justify-between gap-2">
      <h3 class="font-bold">個人別の返金額</h3>
      <div
        v-if="can('settlement', 'edit')"
        class="flex gap-2 items-center"
      >
        <label class="text-sm"
          >切捨て単位
          <select
            :value="page.state.roundingUnit"
            :disabled="!editable"
            class="border rounded p-1"
            @change="changeRounding"
          >
            <option
              v-for="unit in [1, 10, 100, 500]"
              :key="unit"
              :value="unit"
            >
              {{ unit }}円
            </option>
          </select></label
        >
      </div>
    </div>

    <LedgerParticipantSettlement
      :page="page"
      @adjust="adjust"
      @remove="remove"
    />
  </div>
</template>
<script setup lang="ts">
import { eventTotals } from "./settlement-view-model";
import type { LedgerPage } from "@offkai/core";
import { computed } from "vue";
import LedgerCategorySettlement from "./LedgerCategorySettlement.vue";
import LedgerParticipantSettlement from "./LedgerParticipantSettlement.vue";
import { yen } from "../utils/ledger-display";
import type { LedgerPanelEvents } from "../types/ledger-panel-events";
import { useLedgerSession } from "../composables/useLedgerSession";

const props = defineProps<{ page: LedgerPage }>();
const emit = defineEmits<
  LedgerPanelEvents & {
    payment: [kind: "expense" | "income", referenceId: string];
  }
>();
const { editable, can, send } = useLedgerSession();
const openEditor = (...args: LedgerPanelEvents["edit"]) =>
  emit("edit", ...args);
const remove = (...args: LedgerPanelEvents["remove"]) =>
  emit("remove", ...args);
function changeRounding(e: Event) {
  send({
    action: "rounding",
    unit: Number((e.target as HTMLSelectElement).value) as 1 | 10 | 100 | 500,
  });
}
function adjust(personId: string) {
  openEditor(
    "adjustments",
    props.page.state.adjustments.find((a) => a.personId === personId),
    personId,
  );
}
const independentExpenses = computed(() =>
  props.page.state.expenses.filter((expense) => expense.kind === "independent"),
);
const totals = computed(() => eventTotals(props.page));
const finalBalance = computed(() =>
  props.page.calculation.unallocated.length
    ? null
    : totals.value.expected -
      totals.value.expenses +
      props.page.calculation.participants.reduce(
        (sum, p) => sum + p.receivable - p.proposedRefund,
        0,
      ),
);
const finalBalanceActual = computed<number | null>(() => {
  if (props.page.calculation.cash === null) return null;
  const independentReceived = props.page.calculation.charges
    .filter((charge) => charge.categoryId === null)
    .reduce((sum, charge) => sum + charge.received, 0);
  return props.page.calculation.cash - independentReceived;
});
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
