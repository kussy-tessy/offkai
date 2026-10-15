<template>
  <LedgerFormShell
    :heading="heading"
    :busy="busy"
    :submit-disabled="!value && !canReceive"
    :error="error || localError"
    @close="emit('close')"
    @submit="save"
  >
    <p class="font-semibold">{{ personName }}</p>
    <template v-if="kind === 'collection'">
      <section
        v-if="!independentOnly && feeDetails.length"
        class="rounded border border-slate-200 p-3"
      >
        <h4 class="font-semibold mb-2">参加費の明細</h4>
        <div
          v-for="row in feeDetails"
          :key="row.id"
          class="flex justify-between gap-4 py-1 text-sm"
        >
          <span>{{ row.title }}</span
          ><span class="whitespace-nowrap">{{ yen(row.amount) }}</span>
        </div>
        <div
          class="flex justify-between gap-4 border-t mt-2 pt-2 font-semibold"
        >
          <span>合計</span
          ><span class="whitespace-nowrap">{{ yen(feeTotal) }}</span>
        </div>
      </section>
      <label v-if="!value && charges.length > 1"
        >徴収する請求<select
          v-model="form.referenceId"
          @change="suggestAmount"
          required
        >
          <option
            v-for="charge in charges"
            :key="charge.id"
            :value="charge.id"
          >
            {{ charge.title }}（残り {{ yen(charge.remaining) }}）
          </option>
        </select></label
      >
      <p v-else>{{ target?.title ?? "請求の徴収" }}</p>
      <p
        v-if="target"
        class="text-sm text-slate-600"
      >
        {{ target.categoryId ? "参加費" : "別会計" }}・未収
        {{ yen(target.remaining) }}
      </p>
      <p
        v-if="!value && !charges.length"
        class="text-sm"
      >
        未収の請求はありません。
      </p>
    </template>
    <template v-else>
      <p>精算の追加徴収：{{ yen(recoveryRemaining) }}</p>
      <p class="text-sm text-slate-600">
        参加費の未収を含む精算後の残額です。通常の未収額と合算しません。別会計は含みません。
      </p>
    </template>
    <fieldset
      :disabled="busy || (!value && !canReceive)"
      class="space-y-4"
    >
      <label
        >今回徴収した金額<input
          v-model.number="form.amount"
          type="number"
          inputmode="numeric"
          min="1"
          max="1000000000"
          step="1"
          required
      /></label>
      <p
        v-if="!value && form.amount > suggested"
        class="text-sm text-amber-800"
      >
        未収額を超えています。実際に受け取った金額か確認してください。
      </p>
      <label
        >徴収した日時<input
          v-model="form.localAt"
          type="datetime-local"
          required
      /></label>
      <label
        >メモ<textarea
          v-model="form.note"
          rows="2"
          maxlength="2000"
        />
      </label>
    </fieldset>
    <p
      v-if="value"
      class="text-sm text-slate-600"
    >
      この徴収記録の訂正です。追加で徴収した場合は新しく記録してください。
    </p>
  </LedgerFormShell>
</template>
<script setup lang="ts">
import {
  type LedgerPage,
  type LedgerPayment,
  ledgerResourceSchemas,
} from "@offkai/core";
import { computed, reactive, ref } from "vue";
import LedgerFormShell from "../shared/LedgerFormShell.vue";
import { yen } from "../utils/ledger-display";
import { localDate } from "../payments/payment-record-fields";

const props = defineProps<{
  page: LedgerPage;
  personId: string;
  kind: "collection" | "recovery";
  value?: LedgerPayment;
  independentOnly?: boolean;
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{ close: []; save: [payment: LedgerPayment] }>();
const person = computed(() =>
  props.page.calculation.participants.find((p) => p.id === props.personId),
);
const personName = computed(
  () =>
    props.page.state.people.find((p) => p.id === props.personId)?.name ??
    props.personId,
);
const charges = computed(() =>
  props.page.calculation.charges.filter(
    (c) =>
      c.personId === props.personId &&
      (!props.independentOnly || c.categoryId === null) &&
      (c.id === props.value?.referenceId ||
        c.remaining > 0),
  ),
);
const feeDetails = computed(() =>
  props.page.calculation.charges.filter(
    (charge) => charge.personId === props.personId && !!charge.categoryId,
  ),
);
const feeTotal = computed(() =>
  feeDetails.value.reduce((sum, charge) => sum + charge.amount, 0),
);
const recoveryRemaining = computed(() =>
  Math.max(0, -(person.value?.remaining ?? 0)),
);
const form = reactive({
  id: props.value?.id ?? crypto.randomUUID(),
  referenceId:
    props.value?.referenceId ??
    (props.kind === "recovery" ? props.personId : (charges.value[0]?.id ?? "")),
  amount:
    props.value?.amount ??
    (props.kind === "recovery"
      ? recoveryRemaining.value
      : (charges.value[0]?.remaining ?? 0)),
  localAt: localDate(props.value ? new Date(props.value.at) : new Date()),
  note: props.value?.note ?? "",
});
const target = computed(() =>
  charges.value.find((c) => c.id === form.referenceId),
);
const suggested = computed(() =>
  props.kind === "recovery"
    ? recoveryRemaining.value
    : (target.value?.remaining ?? 0),
);
const canReceive = computed(() =>
  props.kind === "recovery" ? recoveryRemaining.value > 0 : !!target.value,
);
const heading = computed(() =>
  props.value
    ? "徴収記録を訂正"
    : props.kind === "recovery"
      ? "追加徴収"
      : props.independentOnly
        ? "別会計の集金"
        : "参加費・個別請求の徴収",
);
const localError = ref("");
function suggestAmount() {
  form.amount = target.value?.remaining ?? 0;
}
function save() {
  if (props.busy || (!props.value && !canReceive.value)) return;
  if (props.kind === "collection" && !target.value) {
    localError.value = "徴収する請求を確認してください。";
    return;
  }
  const date = new Date(form.localAt);
  if (!Number.isFinite(date.getTime())) {
    localError.value = "日時を入力してください。";
    return;
  }
  const result = ledgerResourceSchemas.payments.safeParse({
    id: form.id,
    kind: props.kind,
    referenceId: form.referenceId,
    amount: form.amount,
    at: date.toISOString(),
    note: form.note,
    migrated: props.value?.migrated ?? false,
  });
  if (!result.success) {
    localError.value = "金額と日時を確認してください。";
    return;
  }
  localError.value = "";
  emit("save", result.data);
}
</script>
<style scoped src="../styles/ledger-form.css"></style>
