<template>
  <LedgerFormShell
    :heading="heading"
    :busy="busy"
    :error="error"
    @close="emit('close')"
    @submit="save"
  >
    <p
      v-if="raw.questionId"
      class="text-sm"
    >
      区分名：{{ form.title }}（参加可否質問の名前を使用）
    </p>
    <label v-else
      >名前<input
        v-model="form.title"
        required
        maxlength="200"
    /></label>
    <label
      >基本参加費<input
        v-model.number="form.amount"
        type="number"
        min="0"
        step="1"
        required
    /></label>
    <p
      v-if="raw.questionId"
      class="text-sm text-slate-600"
    >
      対象者は参加可否質問への回答から自動で反映します。個別の請求金額は表から編集できます。
    </p>
    <fieldset
      v-if="!raw.questionId"
      class="rounded border p-3"
    >
      <legend>区分の参加者</legend>
      <label
        v-for="p in state.people"
        :key="p.id"
        class="flex gap-2"
        ><input
          v-model="form.memberIds"
          type="checkbox"
          :value="p.id"
          class="!w-auto"
        />{{ p.name }}</label
      >
      <p class="text-sm text-slate-600">
        変更しても既存の個別請求や経費配分は上書きしません。
      </p>
    </fieldset>
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
const raw: Partial<FinanceLedger["categories"][number]> = props.value
  ? ledgerResourceSchemas.categories.parse(props.value)
  : {};
const form = reactive({
  id: raw.id ?? crypto.randomUUID(),
  title: raw.name ?? "",
  amount: raw.baseAmount ?? 0,
  memberIds: [...(raw.memberIds ?? state.people.map((p) => p.id))],
});
const heading = computed(() => `精算区分を${props.value ? "編集" : "追加"}`);
function save() {
  const result = {
    id: form.id,
    name: form.title,
    questionId: raw.questionId ?? null,
    baseAmount: form.amount,
    memberIds: form.memberIds,
  } satisfies FinanceLedger["categories"][number];
  emit("save", result);
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
