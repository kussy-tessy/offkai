<template>
  <LedgerFormShell
    :heading="heading"
    :busy="busy"
    :error="error"
    @close="emit('close')"
    @submit="save"
  >
    <label
      >名前<input
        v-model="form.title"
        required
        maxlength="200" /></label
    ><label
      >精算区分<select
        v-model="form.categoryId"
        required
        @change="applyCategoryDefaults"
      >
        <option value="">区分を選択</option>
        <option
          v-for="c in state.categories"
          :key="c.id"
          :value="c.id"
        >
          {{ c.name }}
        </option>
      </select></label
    ><AllocationEditor
      v-model="form.allocation"
      :people="state.people"
      label="経費の負担配分"
    />
  </LedgerFormShell>
</template>
<script setup lang="ts">
import {
  type FinanceLedger,
  type LedgerAllocation,
  ledgerResourceSchemas,
} from "@offkai/core";
import { computed, reactive } from "vue";
import AllocationEditor from "../shared/AllocationEditor.vue";
import LedgerFormShell from "../shared/LedgerFormShell.vue";
import type {
  LedgerEditorEvents,
  LedgerEditorProps,
} from "../types/ledger-editor-types";

const props = defineProps<LedgerEditorProps>();
const emit = defineEmits<LedgerEditorEvents>();
const state = props.page.state;
const raw: Partial<FinanceLedger["items"][number]> = props.value
  ? ledgerResourceSchemas.items.parse(props.value)
  : {};
const form = reactive({
  id: raw.id ?? crypto.randomUUID(),
  title: raw.name ?? "",
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
const heading = computed(
  () => `費目の配分設定を${props.value ? "編集" : "追加"}`,
);
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

function save() {
  const result = {
    id: form.id,
    name: form.title,
    categoryId: form.categoryId,
    allocation: form.allocation,
  } satisfies FinanceLedger["items"][number];
  emit("save", result);
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
