<template>
  <LedgerFormShell :heading="heading" tone="expense"
    :context="state.categories.find((c) => c.id === form.categoryId)?.name" :busy="busy" :error="error"
    :submit-disabled="!!allocationError" @close="emit('close')" @submit="save">
    <label>内容<input v-model="form.title" required maxlength="200" /></label>
    <fieldset v-if="form.expenseKind !== 'independent'"
      class="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
      <legend>種類</legend>
      <label class="!flex items-center gap-3"><input v-model="form.expenseKind" type="radio" value="expense"
          class="!w-auto" />通常</label>
      <label class="!flex items-center gap-3"><input v-model="form.expenseKind" type="radio" value="cooperation"
          class="!w-auto" :disabled="!!raw.payerId" />協力金</label>
    </fieldset>
    <p v-if="raw.payerId" class="text-sm">
      既存の立替記録：{{ name(raw.payerId) }}が支払済み
    </p>
    <MoneyExpressionInput v-if="form.expenseKind !== 'cooperation'" :model-value="form.amount"
      @update:model-value="form.amount = $event ?? 0" label="金額" required allow-zero live />
    <fieldset v-if="form.expenseKind === 'cooperation'" class="rounded-xl border border-teal-100 bg-white p-4">
      <legend>協力金の受取人・金額</legend>
      <div class="space-y-3 pb-3">
        <MoneyExpressionInput v-if="!customRecipients" :model-value="commonAmount"
          @update:model-value="commonAmount = $event ?? 0" label="1人あたりの金額" required allow-zero live />
        <MyCheckbox :value="customRecipients" :on-change="toggleRecipients">個人別に金額を変える</MyCheckbox>
      </div>
      <div class="border-t border-slate-200 pt-3">
        <p class="text-sm font-semibold text-slate-600 mb-2">受取人</p>
        <div v-for="row in form.recipients" :key="row.personId"
          class="flex items-center justify-between gap-3 rounded-lg px-2 py-2 odd:bg-slate-50">
          <MyCheckbox :value="selectedRecipients.includes(row.personId)"
            :on-change="(checked) => selectRecipient(row.personId, checked)">{{ name(row.personId) }}</MyCheckbox>
          <MoneyExpressionInput v-if="customRecipients && selectedRecipients.includes(row.personId)"
            :model-value="row.amount" @update:model-value="row.amount = $event ?? 0"
            :label="name(row.personId) + 'の協力金'" required allow-zero live compact hide-label align="right"
            class="w-28 shrink-0" />
        </div>
      </div>
      <p class="font-semibold text-right border-t border-teal-100 mt-3 pt-3 text-teal-800">
        合計 {{ yen(cooperationTotal) }}
      </p>
    </fieldset>
    <AllocationEditor v-if="form.expenseKind !== 'independent'" v-model="form.allocation" :people="state.people"
      :member-ids="state.categories.find((c) => c.id === form.categoryId)?.memberIds ?? []
        " label="経費の負担配分" :total-amount="expenseAmount" />
    <label>メモ<textarea v-model="form.note" rows="2" maxlength="2000" />
    </label>
    <ExpenseImages v-if="props.value && raw.id" :event-id="eventId" :expense-id="raw.id" :editable="!busy" />
    <section v-else class="space-y-2">
      <p class="text-sm font-medium">領収書画像（最大3枚）</p>
      <div class="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center" @dragover.prevent
        @drop.prevent="selectFiles(Array.from($event.dataTransfer?.files ?? []))">
        <label
          class="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white">
          画像を選択
          <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" multiple
            :disabled="busy || remainingSlots <= 0" @change="fileChange" />
        </label>
        <p class="mt-2 text-xs text-slate-600">スマホから選択、またはPCからドラッグ＆ドロップ。JPEG・PNG・WebP・GIF、1枚10MBまで。</p>
      </div>
      <p v-if="imagesError" role="alert" class="text-sm text-red-700">{{ imagesError }}</p>
      <p class="text-xs text-slate-600">支出を保存すると、選んだ画像も一緒に登録されます。</p>
      <ul v-if="receiptFiles.length" class="space-y-1 text-sm">
        <li v-for="(file, index) in receiptFiles" :key="`${file.name}-${index}`"
          class="flex items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2">
          <span class="truncate">{{ file.name }}</span>
          <button type="button" class="shrink-0 text-red-700" :disabled="busy"
            @click="receiptFiles.splice(index, 1)">外す</button>
        </li>
      </ul>
    </section>
  </LedgerFormShell>
</template>
<script setup lang="ts">
  import {
    type FinanceLedger,
    GUIDE_IMAGE_MAX_BYTES,
    type LedgerAllocation,
    ledgerResourceSchemas,
  } from "@offkai/core";
  import { computed, reactive, ref } from "vue";
  import MoneyExpressionInput from "@/common/components/MoneyExpressionInput.vue";
  import MyCheckbox from "@/common/components/MyCheckbox.vue";
  import { useLedgerSession } from "../composables/useLedgerSession";
  import AllocationEditor from "../shared/AllocationEditor.vue";
  import LedgerFormShell from "../shared/LedgerFormShell.vue";
  import type {
    LedgerEditorEvents,
    LedgerEditorProps,
  } from "../types/ledger-editor-types";
  import { yen } from "../utils/ledger-display";
  import ExpenseImages from "./ExpenseImages.vue";

  const props = defineProps<LedgerEditorProps>();
  const emit = defineEmits<LedgerEditorEvents>();
  const state = props.page.state;
  const { eventId } = useLedgerSession();
  const raw: Partial<FinanceLedger["expenses"][number]> = props.value
    ? ledgerResourceSchemas.expenses.parse(props.value)
    : {};
  const form = reactive({
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title ?? "",
    amount: raw.amount ?? 0,
    note: raw.note ?? "",
    categoryId: raw.categoryId ?? props.initialCategoryId ?? "",
    expenseKind:
      raw.kind ?? (props.initialCategoryId === null ? "independent" : "expense"),
    itemId: raw.itemId ?? "",
    payerId: raw.payerId ?? "",
    allocation: {
      mode: raw.allocation?.mode ?? "weights",
      rows: state.people.map((p) => ({
        personId: p.id,
        value: raw.allocation
          ? (raw.allocation.rows.find((r) => r.personId === p.id)?.value ?? 0)
          : 1,
      })),
    } as LedgerAllocation,
    recipients: state.people.map((p) => ({
      personId: p.id,
      amount: raw.recipients?.find((r) => r.personId === p.id)?.amount ?? 0,
    })),
  });
  const receiptFiles = ref<File[]>([]);
  const imagesError = ref("");
  const remainingSlots = computed(() => Math.max(0, 3 - receiptFiles.value.length));
  function selectFiles(files: File[]) {
    if (props.busy) return;
    imagesError.value = "";
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        imagesError.value = `${file.name}: JPEG・PNG・WebP・GIFを選択してください。`;
        continue;
      }
      if (!file.size || file.size > GUIDE_IMAGE_MAX_BYTES) {
        imagesError.value = `${file.name}: 1枚10MB以下の画像を選択してください。`;
        continue;
      }
      if (remainingSlots.value <= 0) {
        imagesError.value = "1件の支出に添付できる画像は3枚までです。";
        break;
      }
      receiptFiles.value.push(file);
    }
  }
  function fileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    selectFiles(Array.from(input.files ?? []));
    input.value = "";
  }
  const heading = computed(
    () =>
      `${form.expenseKind === "independent" ? "別会計の支払い" : "支出"}を${props.value ? "編集" : "追加"}`,
  );
  const selectedRecipients = ref((raw.recipients ?? []).map((r) => r.personId));
  const commonAmount = ref(raw.recipients?.[0]?.amount ?? 0);
  const customRecipients = ref(
    new Set((raw.recipients ?? []).map((r) => r.amount)).size > 1,
  );
  const recipients = computed(() =>
    form.recipients
      .filter((r) => selectedRecipients.value.includes(r.personId))
      .map((r) => ({
        personId: r.personId,
        amount: customRecipients.value ? r.amount : commonAmount.value,
      })),
  );
  const cooperationTotal = computed(() =>
    recipients.value.reduce((sum, r) => sum + r.amount, 0),
  );
  const expenseAmount = computed(() =>
    form.expenseKind === "cooperation" ? cooperationTotal.value : form.amount,
  );
  const allocationError = computed(
    () =>
      form.expenseKind !== "independent" &&
      form.allocation.mode === "fixed" &&
      form.allocation.rows.reduce((sum, row) => sum + Number(row.value), 0) !==
      expenseAmount.value,
  );
  function selectRecipient(id: string, checked: boolean) {
    selectedRecipients.value = checked
      ? [...selectedRecipients.value, id]
      : selectedRecipients.value.filter((p) => p !== id);
    if (checked) {
      const row = form.recipients.find((r) => r.personId === id);
      if (row) row.amount = commonAmount.value;
    }
  }
  function toggleRecipients(checked: boolean) {
    if (checked)
      for (const row of form.recipients) row.amount = commonAmount.value;
    customRecipients.value = checked;
  }
  if (!props.value && form.categoryId) applyCategoryDefaults();
  function applyCategoryDefaults() {
    const category = state.categories.find((c) => c.id === form.categoryId);
    if (!category) return;
    form.itemId = "";
    form.allocation = {
      mode: "weights",
      rows: state.people.map((p) => ({
        personId: p.id,
        value: category.memberIds.includes(p.id) ? 1 : 0,
      })),
    };
  }
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  function save() {
    if (allocationError.value) return;
    const result = {
      id: form.id,
      title: form.title,
      amount:
        form.expenseKind === "cooperation" ? cooperationTotal.value : form.amount,
      note: form.note,
      kind: form.expenseKind,
      categoryId:
        form.expenseKind === "independent" ? null : form.categoryId || null,
      itemId: form.expenseKind === "independent" ? null : form.itemId || null,
      allocation: form.allocation,
      payerId: form.expenseKind === "expense" ? form.payerId || null : null,
      recipients:
        form.expenseKind === "cooperation"
          ? recipients.value.filter((r) => r.amount > 0)
          : [],
    } satisfies FinanceLedger["expenses"][number];
    emit("save", result, undefined, receiptFiles.value);
  }
</script>
<style scoped src="../styles/ledger-form.css"></style>
