<template>
  <LedgerFormShell
    :heading="heading"
    :busy="busy"
    :error="error"
    @close="emit('close')"
    @submit="save"
  >
    <label
      >内容<input
        v-model="form.title"
        required
        maxlength="200" /></label
    ><label
      >精算区分<select
        v-model="form.categoryId"
        @change="applyCategoryDefaults"
      >
        <option value="">別会計（帽子代など）</option>
        <option
          v-for="c in state.categories"
          :key="c.id"
          :value="c.id"
        >
          {{ c.name }}
        </option>
      </select></label
    ><label
      >参加者<select
        v-model="form.personId"
        required
      >
        <option
          v-for="p in state.people"
          :key="p.id"
          :value="p.id"
        >
          {{ p.name }}
        </option>
      </select></label
    ><label
      v-if="form.categoryId"
      class="flex gap-2 items-center"
      ><input
        v-model="form.usesBaseAmount"
        type="checkbox"
        class="!w-auto"
        @change="useBaseAmount"
      />基本参加費に合わせる（基本金額の変更にも追従）</label
    ><label
      >金額<input
        v-model.number="form.amount"
        :disabled="form.usesBaseAmount && !!form.categoryId"
        type="number"
        min="0"
        step="1"
        required
    /></label>
    <p
      v-if="!form.categoryId"
      class="text-sm text-slate-600"
    >
      帽子代など、イベントの返金計算に含めない請求です。例えば、預かった帽子代を販売者へ支払う場合は、経費精算で「別会計の支払い」として記録します。請求の追加だけでは入出金は記録されません。
    </p>
    <label
      >メモ<textarea
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
const raw: Partial<FinanceLedger["charges"][number]> = props.value
  ? ledgerResourceSchemas.charges.parse(props.value)
  : {};
const form = reactive({
  id: raw.id ?? crypto.randomUUID(),
  title: raw.title ?? "",
  amount: raw.amount ?? 0,
  note: raw.note ?? "",
  personId: raw.personId ?? props.initialPersonId ?? state.people[0]?.id ?? "",
  categoryId: raw.categoryId ?? "",
  usesBaseAmount: Boolean(raw.usesBaseAmount),
});
const heading = computed(() => `請求を${props.value ? "編集" : "追加"}`);
function useBaseAmount() {
  if (form.usesBaseAmount)
    form.amount =
      state.categories.find((c) => c.id === form.categoryId)?.baseAmount ??
      form.amount;
}
function applyCategoryDefaults() {
  const category = state.categories.find((c) => c.id === form.categoryId);
  if (category && !props.value) form.amount = category.baseAmount;
}
function save() {
  const result = {
    id: form.id,
    title: form.title,
    amount: form.amount,
    note: form.note,
    personId: form.personId,
    categoryId: form.categoryId || null,
    confirmed: true,
    usesBaseAmount: !!form.categoryId && form.usesBaseAmount,
  } satisfies FinanceLedger["charges"][number];
  emit("save", result);
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
