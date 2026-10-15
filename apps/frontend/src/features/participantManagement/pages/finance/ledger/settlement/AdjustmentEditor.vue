<template>
  <LedgerFormShell
    :heading="heading"
    :busy="busy"
    :error="error"
    @close="emit('close')"
    @submit="save"
  >
    <p class="text-sm text-slate-600">
      調整は予定参加費を全額受領した場合の返金総額に適用します。今回やり取りする額は返金・追加徴収画面で確認できます。
    </p>
    <fieldset class="space-y-2">
      <legend class="font-semibold">調整方法</legend>
      <label
        v-for="option in adjustmentModes"
        :key="option.value"
        class="!flex !flex-row items-center gap-2"
      >
        <input
          v-model="form.adjustmentMode"
          type="radio"
          name="adjustmentMode"
          :value="option.value"
        />
        {{ option.label }}
      </label>
    </fieldset>
    <label v-if="form.adjustmentMode !== 'none'"
      >{{
        form.adjustmentMode === "delta"
          ? "調整額（増額は＋、減額は−）"
          : "最終総額（返金済み分を含む）"
      }}<input
        v-model.number="form.amount"
        type="number"
        step="1"
        required
    /></label>
    <p
      v-if="form.adjustmentMode === 'fixed'"
      class="text-sm text-slate-600"
    >
      最終総額は「今回渡す額」ではありません。指定額は再計算後も維持されます。マイナスは追加負担です。
    </p>
    <label v-if="form.adjustmentMode !== 'none'"
      >調整理由<textarea
        v-model="form.note"
        rows="2"
        maxlength="2000"
      />
    </label>
  </LedgerFormShell>
</template>
<script setup lang="ts">
import { reactive, computed } from "vue";
import { ledgerResourceSchemas, type FinanceLedger } from "@offkai/core";
import type {
  LedgerEditorProps,
  LedgerEditorEvents,
} from "../types/ledger-editor-types";
import LedgerFormShell from "../shared/LedgerFormShell.vue";

const props = defineProps<LedgerEditorProps>();
const emit = defineEmits<LedgerEditorEvents>();
const state = props.page.state;
const raw: Partial<FinanceLedger["adjustments"][number]> = props.value
  ? ledgerResourceSchemas.adjustments.parse(props.value)
  : {};
const adjustmentModes = [
  { value: "none", label: "調整しない" },
  { value: "delta", label: "加算・減算" },
  { value: "fixed", label: "返金総額を指定" },
] as const;
const form = reactive({
  id: raw.id ?? crypto.randomUUID(),
  personId: raw.personId ?? props.initialPersonId ?? state.people[0]?.id ?? "",
  amount: raw.amount ?? 0,
  note: raw.note ?? "",
  adjustmentMode: (raw.mode ?? "none") as "none" | "delta" | "fixed",
});
const heading = computed(
  () =>
    `${state.people.find((p) => p.id === form.personId)?.name ?? "参加者"}の返金の手動調整を編集`,
);

function save() {
  if (form.adjustmentMode === "none") {
    if (raw.id) emit("removeAdjustment", raw.id);
    else emit("close");
    return;
  }
  const result = {
    id: form.id,
    personId: form.personId,
    mode: form.adjustmentMode,
    amount: form.amount,
    note: form.note,
  } satisfies FinanceLedger["adjustments"][number];
  emit("save", result);
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
