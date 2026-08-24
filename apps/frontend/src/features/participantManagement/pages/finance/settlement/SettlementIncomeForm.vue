<template>
  <form class="space-y-3 rounded-lg bg-emerald-50 p-3" @submit.prevent="submit">
    <div class="grid gap-3 sm:grid-cols-[1fr_10rem]">
      <label class="text-sm text-slate-600"
        >内容<input
          v-model="title"
          required
          maxlength="100"
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          placeholder="例：前回からの繰越金"
      /></label>
      <label class="text-sm text-slate-600"
        >金額<input
          v-model="amount"
          required
          type="number"
          min="1"
          step="1"
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-right"
      /></label>
    </div>
    <label class="block text-sm text-slate-600"
      >備考（任意）<textarea
        v-model="note"
        rows="2"
        class="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2"
      />
    </label>
    <div class="flex justify-end gap-2">
      <MyButton
        type="button"
        size="sm"
        color="gray"
        variant="ghost"
        :disabled="saving"
        @click="onCancel"
      >
        キャンセル
      </MyButton>
      <MyButton
        type="submit"
        size="sm"
        :loading="saving"
        :disabled="!valid || saving"
        >保存</MyButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import type { SettlementIncome, SettlementIncomeInput } from "./types";

const props = defineProps<{
  categoryId: string;
  income: SettlementIncome | null;
  saving: boolean;
  save: (
    input: SettlementIncomeInput,
    incomeId: string | null,
  ) => Promise<boolean>;
  onCancel: () => void;
}>();
const title = ref(props.income?.title ?? "");
const amount = ref(props.income ? String(props.income.amount) : "");
const note = ref(props.income?.note ?? "");
const valid = computed(
  () =>
    title.value.trim() &&
    Number.isInteger(Number(amount.value)) &&
    Number(amount.value) > 0,
);
const submit = async () => {
  if (!valid.value) return;
  const saved = await props.save(
    {
      categoryId: props.categoryId,
      title: title.value.trim(),
      amount: Number(amount.value),
      note: note.value.trim() || null,
    },
    props.income?.id ?? null,
  );
  if (saved) props.onCancel();
};
</script>
