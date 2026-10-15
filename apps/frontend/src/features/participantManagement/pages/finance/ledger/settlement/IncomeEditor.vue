<template>
  <LedgerFormShell
    :heading="heading"
    :context="state.categories.find((c) => c.id === form.categoryId)?.name"
    :busy="busy"
    :error="error"
    :submit-disabled="allocationMismatch"
    @close="emit('close')"
    @submit="save"
  >
    <label
      >費目<input
        v-model="form.title"
        placeholder="例: 〇〇さんからカンパ"
        required
        maxlength="200" /></label
    ><MoneyExpressionInput
      :model-value="form.amount"
      @update:model-value="form.amount = $event ?? 0"
      label="金額"
      required
      allow-zero
      live
    />
    <AllocationEditor
      v-model="form.allocation"
      :people="state.people"
      :member-ids="
        state.categories.find((c) => c.id === form.categoryId)?.memberIds ?? []
      "
      label="負担軽減額の配分"
      :total-amount="form.amount"
    />
    <ImmediatePaymentFields
      v-if="!value"
      v-model="paymentFields"
    /><label
      >メモ<textarea
        v-model="form.note"
        rows="2"
        maxlength="2000"
      />
    </label>
  </LedgerFormShell>
</template>
<script setup lang="ts">
import {
  type FinanceLedger,
  type LedgerAllocation,
  ledgerResourceSchemas,
} from "@offkai/core";
import { computed, reactive, ref } from "vue";
import MoneyExpressionInput from "@/common/components/MoneyExpressionInput.vue";
import AllocationEditor from "../shared/AllocationEditor.vue";
import ImmediatePaymentFields from "../payments/ImmediatePaymentFields.vue";
import LedgerFormShell from "../shared/LedgerFormShell.vue";
import type {
  LedgerEditorEvents,
  LedgerEditorProps,
} from "../types/ledger-editor-types";
import {
  immediatePayment,
  newPaymentFields,
} from "../payments/payment-record-fields";

const props = defineProps<LedgerEditorProps>();
const emit = defineEmits<LedgerEditorEvents>();
const state = props.page.state;
const raw: Partial<FinanceLedger["incomes"][number]> = props.value
  ? ledgerResourceSchemas.incomes.parse(props.value)
  : {};
const form = reactive({
  id: raw.id ?? crypto.randomUUID(),
  title: raw.title ?? "",
  amount: raw.amount ?? 0,
  note: raw.note ?? "",
  categoryId: raw.categoryId ?? props.initialCategoryId ?? "",
  allocation: {
    mode: raw.allocation?.mode ?? "weights",
    rows: state.people.map((p) => ({
      personId: p.id,
      value: raw.allocation
        ? (raw.allocation.rows.find((r) => r.personId === p.id)?.value ?? 0)
        : 1,
    })),
  } as LedgerAllocation,
});
const heading = computed(() => `その他収入を${props.value ? "編集" : "追加"}`);
const paymentFields = ref({ ...newPaymentFields(), payNow: true });
if (!props.value && form.categoryId) applyCategoryDefaults();
function applyCategoryDefaults() {
  const category = state.categories.find((c) => c.id === form.categoryId);
  if (!category) return;
  form.allocation = {
    mode: "weights",
    rows: state.people.map((p) => ({
      personId: p.id,
      value: category.memberIds.includes(p.id) ? 1 : 0,
    })),
  };
}

const allocationMismatch = computed(
  () =>
    form.allocation.mode === "fixed" &&
    form.allocation.rows.reduce((sum, row) => sum + Number(row.value), 0) !==
      form.amount,
);

function save() {
  if (allocationMismatch.value) return;
  const result = {
    id: form.id,
    title: form.title,
    amount: form.amount,
    note: form.note,
    categoryId: form.categoryId,
    allocation: form.allocation,
  } satisfies FinanceLedger["incomes"][number];
  emit(
    "save",
    result,
    props.value
      ? undefined
      : immediatePayment(paymentFields.value, form.id, form.amount, "income"),
  );
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
