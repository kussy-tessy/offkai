<template>
  <div
    class="fixed inset-0 z-50 !m-0 flex justify-end bg-black/30"
    @click.self="!busy && emit('close')"
  >
    <section
      role="dialog"
      aria-modal="true"
      :aria-label="`${personName}の請求を${readonly ? '確認' : '編集'}`"
      class="bg-white w-full max-w-2xl h-dvh flex flex-col overflow-hidden shadow-xl"
    >
      <form
        class="flex flex-col min-h-0 h-full"
        @submit.prevent="save"
      >
        <header class="shrink-0 p-4 sm:px-6 border-b">
          <h3 class="text-lg font-bold">{{ personName }}の請求</h3>
          <p class="text-sm text-slate-600">
            金額の単位：円。保存すると徴収予定額に反映します。
          </p>
        </header>
        <div class="flex-1 overflow-y-auto min-h-0 p-4 sm:px-6 space-y-5">
          <fieldset
            v-for="row in basics"
            :key="row.categoryId"
            class="border rounded-lg p-3 space-y-2"
            :disabled="busy || readonly || !row.active"
          >
            <legend class="px-1 font-semibold">{{ row.name }}</legend>
            <template v-if="row.active">
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm">
                  <input
                    v-model="row.mode"
                    type="radio"
                    :name="`amount-mode-${row.categoryId}`"
                    value="base"
                    :aria-label="`${row.name}：基本金額を使う`"
                    class="accent-teal-600"
                  />
                  基本金額を使う（{{ format(row.baseAmount) }}）
                </label>
                <label class="flex items-center gap-2 text-sm">
                  <input
                    v-model="row.mode"
                    type="radio"
                    :name="`amount-mode-${row.categoryId}`"
                    value="custom"
                    :aria-label="`${row.name}：個別金額を指定する`"
                    class="accent-teal-600"
                  />
                  個別金額を指定する
                </label>
                <input
                  v-model.number="row.amount"
                  :aria-label="`${row.name}の個別金額`"
                  :disabled="row.mode !== 'custom'"
                  class="field text-slate-900 disabled:text-slate-400"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="1000000000"
                  step="1"
                  :required="row.mode === 'custom'"
                />
              </div>
              <label class="block text-sm"
                >調整メモ（任意）<input
                  v-model="row.note"
                  :aria-label="`${row.name}の調整メモ`"
                  class="field"
                  maxlength="2000"
              /></label>
            </template>
            <template v-else>
              <p class="text-sm text-slate-600">
                {{ row.linked ? "不参加・請求対象外" : "この区分の対象外" }}
              </p>
              <p
                v-if="row.received"
                class="text-sm text-amber-800"
              >
                徴収
                {{ format(row.received) }}
                は保持しています。受け渡し残額は精算画面で確認してください。
              </p>
              <p
                v-if="row.mode === 'custom'"
                class="text-sm"
              >
                以前の個別指定 ＊{{ format(row.amount) }}
                は再参加時に適用します。
              </p>
            </template>
          </fieldset>
          <p
            v-if="basics.some((r) => r.linked)"
            class="text-xs text-slate-600"
          >
            質問に対応する区分の対象者は、参加可否の回答から変更してください。免除は個別金額を0にします。
          </p>
          <section class="space-y-3">
            <h4 class="font-bold">追加請求</h4>
            <fieldset
              v-for="(row, index) in extras"
              :key="row.id"
              :disabled="busy || readonly"
              class="border rounded-lg p-3 space-y-2"
            >
              <legend class="px-1 text-sm">追加請求 {{ index + 1 }}</legend>
              <label class="block text-sm"
                >内容<input
                  v-model="row.title"
                  class="field"
                  :aria-label="`追加請求${index + 1}の内容`"
                  maxlength="200"
                  required
              /></label>
              <label class="block text-sm"
                >扱い<select
                  v-model="row.categoryId"
                  class="field"
                  :disabled="hasPayments(row.id)"
                  :aria-label="`追加請求${index + 1}の扱い`"
                >
                  <option :value="null">
                    別会計（帽子代など・イベントの返金計算に含めない）
                  </option>
                  <option
                    v-for="category in page.state.categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}（イベント精算に含める）
                  </option>
                </select></label
              >
              <label class="block text-sm"
                >金額<input
                  v-model.number="row.amount"
                  class="field"
                  :aria-label="`追加請求${index + 1}の金額`"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="1000000000"
                  step="1"
                  required
              /></label>
              <label class="block text-sm"
                >メモ（任意）<input
                  v-model="row.note"
                  class="field"
                  :aria-label="`追加請求${index + 1}のメモ`"
                  maxlength="2000"
              /></label>
              <div class="flex justify-end">
                <MyButton
                  type="button"
                  class="disabled:opacity-40 !border-0 !p-1"
                  color="red"
                  :disabled="hasPayments(row.id)"
                  :aria-label="`追加請求${index + 1}を削除`"
                  :title="
                    hasPayments(row.id)
                      ? '徴収記録があるため削除できません'
                      : '追加請求を削除'
                  "
                  @click="extras.splice(index, 1)"
                  size="sm"
                  variant="ghost"
                >
                  <FontAwesomeIcon :icon="faTrash" />
                </MyButton>
              </div>
              <p
                v-if="hasPayments(row.id)"
                class="text-xs text-slate-600"
              >
                徴収記録があるため削除・区分変更はできません。金額・内容・メモは訂正できます。
              </p>
            </fieldset>
            <MyButton
              type="button"
              class="border rounded px-3 py-2 text-sm !border-0 !p-1"
              :disabled="busy || readonly"
              v-if="!readonly"
              @click="addExtra"
              size="sm"
              variant="ghost"
            >
              追加請求を追加
            </MyButton>
          </section>
          <p
            v-if="error || localError"
            role="alert"
            class="rounded bg-red-50 p-3 text-red-700"
          >
            {{ error || localError }}
          </p>
        </div>
        <footer class="shrink-0 bg-white border-t p-4 sm:px-6 space-y-3">
          <p class="font-bold">請求合計 {{ format(total) }}</p>
          <div class="flex gap-3">
            <MyButton
              v-if="!readonly"
              type="submit"
              :disabled="busy || readonly"
              size="sm"
            >
              {{ busy ? "保存中…" : "保存" }}</MyButton
            ><MyButton
              type="button"
              :disabled="busy"
              class="border rounded px-3 py-2 !border-0 !p-1"
              @click="$emit('close')"
              size="sm"
              variant="ghost"
            >
              {{ readonly ? "閉じる" : "キャンセル" }}
            </MyButton>
          </div>
        </footer>
      </form>
    </section>
  </div>
</template>
<script setup lang="ts">
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  type LedgerPage,
  type ParticipantChargesInput,
  ParticipantChargesInputSchema,
} from "@offkai/core";
import { computed, reactive, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";

const props = defineProps<{
  page: LedgerPage;
  personId: string;
  busy: boolean;
  readonly?: boolean;
  error: string;
}>();
const emit = defineEmits<{
  close: [];
  save: [input: ParticipantChargesInput];
}>();
const personName =
  props.page.state.people.find((p) => p.id === props.personId)?.name ??
  props.personId;
const basics = reactive(
  props.page.state.categories.map((c) => {
    const charge = props.page.state.charges.find(
      (ch) =>
        ch.isBase && ch.personId === props.personId && ch.categoryId === c.id,
    );
    return {
      categoryId: c.id,
      name: c.name,
      linked: !!c.questionId,
      active: c.memberIds.includes(props.personId),
      baseAmount: c.baseAmount,
      mode: charge && !charge.usesBaseAmount ? "custom" : "base",
      amount: charge?.amount ?? c.baseAmount,
      note: charge?.note ?? "",
      received:
        props.page.calculation.charges.find((ch) => ch.id === charge?.id)
          ?.received ?? 0,
    };
  }),
);
const extras = reactive(
  props.page.state.charges
    .filter((c) => c.personId === props.personId && !c.isBase)
    .map((c) => ({
      id: c.id,
      categoryId: c.categoryId,
      title: c.title,
      amount: c.amount,
      note: c.note,
    })),
);
const paidIds = new Set(
  props.page.state.payments
    .filter((p) => p.kind === "collection")
    .map((p) => p.referenceId),
);
// Readers with fee-calculation permission may not see payment records. Charge
// projections still expose received totals; the server also enforces this rule.
const hasPayments = (id: string) =>
  paidIds.has(id) ||
  !!props.page.calculation.charges.find((c) => c.id === id)?.received;
const format = (amount: number) =>
  Number.isFinite(amount) ? amount.toLocaleString("ja-JP") : "—";
const total = computed(
  () =>
    basics.reduce(
      (sum, r) =>
        sum +
        (r.active ? Number(r.mode === "base" ? r.baseAmount : r.amount) : 0),
      0,
    ) + extras.reduce((sum, r) => sum + Number(r.amount), 0),
);
const localError = ref("");
function addExtra() {
  extras.push({
    id: crypto.randomUUID(),
    categoryId: null,
    title: "",
    amount: 0,
    note: "",
  });
}
function save() {
  if (props.readonly) return;
  const parsed = ParticipantChargesInputSchema.safeParse({
    personId: props.personId,
    baseChanges: basics
      .filter((r) => r.active)
      .map((r) => ({
        categoryId: r.categoryId,
        amountOverride: r.mode === "base" ? null : r.amount,
        note: r.note,
      })),
    extras: [...extras],
  });
  if (!parsed.success) {
    localError.value =
      "金額は0以上の整数、追加請求の内容は200文字以内で入力してください。";
    return;
  }
  localError.value = "";
  emit("save", parsed.data);
}
</script>
<style scoped>
.field {
  @apply block w-full min-w-0 mt-1 border border-slate-300 rounded p-2 bg-white disabled:bg-slate-50;
}
</style>
