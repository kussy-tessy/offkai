<template>
  <component
    :is="editors[resource]"
    :page="page"
    :value="value"
    :busy="busy"
    :error="error"
    :initial-person-id="initialPersonId"
    :initial-payment-kind="initialPaymentKind"
    :initial-category-id="initialCategoryId"
    :initial-reference-id="initialReferenceId"
    @close="emit('close')"
    @save="save"
    @remove-adjustment="(id: string) => emit('removeAdjustment', id)"
  />
</template>
<script setup lang="ts">
import type { LedgerPayment, LedgerResource } from "@offkai/core";
import AdjustmentEditor from "../settlement/AdjustmentEditor.vue";
import CategoryEditor from "../calculation/CategoryEditor.vue";
import ChargeEditor from "../calculation/ChargeEditor.vue";
import ExpenseEditor from "../settlement/ExpenseEditor.vue";
import IncomeEditor from "../settlement/IncomeEditor.vue";
import ItemEditor from "../settlement/ItemEditor.vue";
import type {
  LedgerEditorEvents,
  LedgerEditorProps,
} from "../types/ledger-editor-types";
import PaymentEditor from "../payments/PaymentEditor.vue";

defineProps<LedgerEditorProps & { resource: LedgerResource }>();
const emit = defineEmits<LedgerEditorEvents>();
const editors = {
  categories: CategoryEditor,
  items: ItemEditor,
  charges: ChargeEditor,
  expenses: ExpenseEditor,
  incomes: IncomeEditor,
  adjustments: AdjustmentEditor,
  payments: PaymentEditor,
};
function save(value: unknown, payment?: LedgerPayment, receiptFiles?: File[]) {
  emit("save", value, payment, receiptFiles);
}
</script>
