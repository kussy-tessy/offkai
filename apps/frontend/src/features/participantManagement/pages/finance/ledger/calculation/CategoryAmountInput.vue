<template>
  <div>
    <label>
      <span class="sr-only">基本参加費</span>
      <input
        :value="draft"
        @input="updateDraft"
        :aria-label="`${category.name}の基本参加費`"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        required
        :disabled="!editable"
        class="w-24 max-w-full rounded border border-slate-300 p-2 text-right disabled:bg-slate-50"
        @blur="save"
        @keydown.enter.prevent="finish"
      />
    </label>
    <p
      v-if="validationError"
      role="alert"
      class="text-xs text-red-700 mt-1"
    >
      {{ validationError }}
    </p>
    <p
      v-else-if="status"
      role="status"
      class="caption mt-1"
    >
      {{ status }}
    </p>
  </div>
</template>
<script setup lang="ts">
import type { FinanceLedger } from "@offkai/core";
import { ref, watch } from "vue";
import { useLedgerSession } from "../composables/useLedgerSession";

const props = defineProps<{ category: FinanceLedger["categories"][number] }>();
const { editable, can, send } = useLedgerSession();
const draft = ref(String(props.category.baseAmount));
const validationError = ref("");
const status = ref("");
// Refresh untouched fields, but retain an unsaved amount after a failed request.
watch(
  () => props.category.baseAmount,
  (value, previous) => {
    if (draft.value === String(previous)) draft.value = String(value);
  },
);
function updateDraft(event: Event) {
  draft.value = (event.target as HTMLInputElement).value;
  validationError.value = "";
  status.value = "";
}
function finish(event: KeyboardEvent) {
  (event.target as HTMLInputElement).blur();
}
async function save() {
  if (!editable.value || !can("feeCalculation", "edit")) return;
  validationError.value = "";
  status.value = "";
  const value = Number(draft.value);
  if (!draft.value.trim() || !Number.isSafeInteger(value) || value < 0) {
    validationError.value = "0以上の整数を入力してください。";
    return;
  }
  if (value === props.category.baseAmount) return;
  status.value = "保存中…";
  const saved = await send({
    action: "put",
    resource: "categories",
    value: { ...props.category, baseAmount: value },
  });
  if (saved) draft.value = String(value);
  status.value = saved
    ? "保存しました"
    : "保存できませんでした。入力額は保持しています。";
}
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
