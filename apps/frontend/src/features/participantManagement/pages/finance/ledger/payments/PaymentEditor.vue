<template>
  <LedgerFormShell
    :heading="heading"
    :busy="busy"
    :error="error"
    @close="emit('close')"
    @submit="save"
  >
    <label v-if="!initialReferenceId"
      >受け渡しの種類<select
        v-model="form.paymentKind"
        :disabled="!!value"
        @change="
          form.referenceId = '';
          form.amount = 0;
        "
      >
        <option
          v-for="kind in paymentKinds"
          :key="kind.value"
          :value="kind.value"
        >
          {{ kind.label }}
        </option>
      </select></label
    >
    <p
      v-else
      class="font-semibold"
    >
      {{ paymentKindLabel }}
    </p>
    <label v-if="!initialReferenceId"
      >対象<select
        v-model="form.referenceId"
        required
        :disabled="!!value"
        @change="suggestAmount"
      >
        <option
          value=""
          disabled
        >
          選択してください
        </option>
        <option
          v-for="option in paymentReferences"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </option>
      </select></label
    >
    <p v-else>
      対象：{{ selectedReference?.label ?? "対象の明細が見つかりません" }}
    </p>
    <label
      >今回{{
        incoming
          ? "受け取った"
          : form.paymentKind === "refund"
            ? "返金した"
            : "支払った"
      }}金額<input
        v-model.number="form.amount"
        type="number"
        min="1"
        step="1"
        required
    /></label>
    <p class="text-sm text-slate-600">
      実際に受け渡した額を入力してください。入力ミスはこの記録を編集・削除して訂正できます。
    </p>
    <label
      >日時<input
        v-model="form.localAt"
        type="datetime-local"
        required
    /></label>
    <p
      v-if="cashWarning"
      class="bg-amber-50 p-2 text-amber-900"
    >
      記録上の資金残高を超える出金です。収入の受領記録などに漏れがないか確認してください。
    </p>
    <label
      >メモ<textarea
        v-model="form.note"
        rows="2"
        maxlength="2000"
      />
    </label>
    <p
      v-if="value"
      class="text-sm text-slate-600"
    >
      過去の誤入力を訂正します。実際に追加の受け渡しがあった場合は、新規記録を追加してください。
    </p>
  </LedgerFormShell>
</template>
<script setup lang="ts">
import {
  type FinanceLedger,
  type LedgerPayment,
  ledgerResourceSchemas,
} from "@offkai/core";
import { computed, reactive } from "vue";
import LedgerFormShell from "../shared/LedgerFormShell.vue";
import type {
  LedgerEditorEvents,
  LedgerEditorProps,
} from "../types/ledger-editor-types";
import { localDate } from "./payment-record-fields";

const props = defineProps<LedgerEditorProps>();
const emit = defineEmits<LedgerEditorEvents>();
const state = props.page.state;
const raw: Partial<FinanceLedger["payments"][number]> = props.value
  ? ledgerResourceSchemas.payments.parse(props.value)
  : {};
const form = reactive({
  id: raw.id ?? crypto.randomUUID(),
  amount: raw.amount ?? 0,
  paymentKind: raw.kind ?? props.initialPaymentKind ?? "collection",
  referenceId: raw.referenceId ?? props.initialReferenceId ?? "",
  localAt: localDate(raw.at ? new Date(raw.at) : new Date()),
  note: raw.note ?? "",
});
const heading = computed(() => {
  if (props.value) return "受け渡し記録を訂正";
  if (form.paymentKind === "refund") return "部分返金";
  if (props.initialReferenceId)
    return form.paymentKind === "income"
      ? "収入の受領を記録"
      : "経費の支払いを記録";
  return "受け渡しを追加";
});
const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
function allowed(area: "feeCollection" | "refund" | "settlement") {
  return (
    props.page.access.owner ||
    ["record", "edit", "confirm"].includes(props.page.access.permissions[area])
  );
}
const paymentKinds = computed(() =>
  [
    {
      value: "collection",
      label: "参加費・個別請求の徴収",
      area: "feeCollection",
    },
    { value: "recovery", label: "精算による追加徴収", area: "feeCollection" },
    { value: "refund", label: "参加者への精算金の返金", area: "refund" },
    { value: "expense", label: "業者・別会計への支払い", area: "settlement" },
    { value: "income", label: "カンパなどの受領", area: "settlement" },
  ].filter(
    (k) =>
      (k.value !== "expense" || raw.kind === "expense") &&
      allowed(k.area as "feeCollection" | "refund" | "settlement"),
  ),
);
if (
  !props.value &&
  !paymentKinds.value.some((k) => k.value === form.paymentKind)
)
  form.paymentKind = (paymentKinds.value[0]?.value ??
    "collection") as LedgerPayment["kind"];
const incoming = computed(() =>
  ["collection", "recovery", "income"].includes(form.paymentKind),
);
const paid = (kind: string, referenceId: string) =>
  state.payments
    .filter((p) => p.kind === kind && p.referenceId === referenceId)
    .reduce((s, p) => s + p.amount, 0);
const paymentReferences = computed(() => {
  if (form.paymentKind === "collection")
    return props.page.calculation.charges
      .map((c) => ({
        id: c.id,
        label: `${name(c.personId)}／${c.title}（未収${c.remaining}円）`,
        amount: Math.max(0, c.remaining),
        personId: c.personId,
      }));
  if (form.paymentKind === "refund" || form.paymentKind === "recovery")
    return props.page.calculation.participants.map((p) => ({
      id: p.id,
      label: `${p.name}（${p.remaining === null ? "未配分あり" : `精算残額${p.remaining}円`}）`,
      amount: Math.max(
        0,
        (p.remaining ?? 0) * (form.paymentKind === "refund" ? 1 : -1),
      ),
      personId: p.id,
    }));
  if (form.paymentKind === "expense")
    return state.expenses
      .filter((e) => !e.payerId && e.kind !== "cooperation")
      .map((e) => ({
        id: e.id,
        label: e.title,
        amount: Math.max(0, e.amount - paid("expense", e.id)),
        personId: "",
      }));
  if (form.paymentKind === "income")
    return state.incomes.map((i) => ({
      id: i.id,
      label: i.title,
      amount: Math.max(0, i.amount - paid("income", i.id)),
      personId: "",
    }));
  return [];
});
const selectedReference = computed(() =>
  paymentReferences.value.find((r) => r.id === form.referenceId),
);
const paymentKindLabel = computed(
  () =>
    paymentKinds.value.find((kind) => kind.value === form.paymentKind)?.label ??
    "受け渡し",
);
function suggestAmount() {
  const target = paymentReferences.value.find((r) => r.id === form.referenceId);
  if (target) {
    form.amount = target.amount;
  }
}
if (!props.value && props.initialReferenceId) suggestAmount();
const cashWarning = computed(
  () =>
    !incoming.value &&
    props.page.calculation.cash !== null &&
    form.amount > props.page.calculation.cash,
);

function save() {
  const result = {
    id: form.id,
    kind: form.paymentKind,
    referenceId: form.referenceId,
    amount: form.amount,
    at: new Date(form.localAt).toISOString(),
    note: form.note,
    migrated: Boolean(raw.migrated),
  } satisfies FinanceLedger["payments"][number];
  emit("save", result);
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
