<template>
  <fieldset class="rounded-xl border border-slate-200 p-4">
    <legend class="px-1 font-semibold">{{ label }}</legend>
    <div class="space-y-2">
      <label class="flex items-center gap-2"
        ><input
          type="radio"
          :name="radioName"
          :checked="!custom"
          @change="toggleCustom(false)"
        />均等</label
      >
      <label class="flex items-center gap-2"
        ><input
          type="radio"
          :name="radioName"
          :checked="custom"
          @change="toggleCustom(true)"
        />個別</label
      >
    </div>
    <p
      v-if="!custom"
      class="text-sm text-slate-600 mt-2"
    >
      区分の参加者で均等に配分します。
    </p>
    <template v-if="custom">
      <select
        v-model="model.mode"
        class="my-3 rounded border p-2"
        aria-label="配分方法"
      >
        <option value="weights">重みで配分</option>
        <option value="fixed">金額を直接指定</option>
      </select>
      <p class="mb-2 text-sm text-slate-600">
        {{
          model.mode === "weights"
            ? "0は対象外、1は通常、0.5は半口です。実際の総額を重みの合計で割ります。"
            : "対象者の金額の合計を、明細の総額に合わせてください。"
        }}
      </p>
      <div class="max-h-64 overflow-auto space-y-1">
        <div
          v-for="row in model.rows"
          :key="row.personId"
          class="allocation-row flex items-center justify-between gap-2 rounded-lg px-2 py-1"
        >
          <span
            ><span
              class="inline-block w-5"
              :aria-label="
                memberIds?.includes(row.personId)
                  ? 'この区分の参加者'
                  : undefined
              "
              ><FontAwesomeIcon
                v-if="memberIds?.includes(row.personId)"
                :icon="faCircleCheck"
                class="text-teal-600 text-xs" /></span
            >{{
              people.find((p) => p.id === row.personId)?.name ?? row.personId
            }}</span
          >
          <MoneyExpressionInput
            v-if="model.mode === 'fixed'"
            :model-value="row.value"
            @update:model-value="row.value = $event ?? 0"
            :label="`${people.find((p) => p.id === row.personId)?.name}の金額`"
            required
            allow-zero
            live
            compact
            hide-label
            align="right"
            class="w-24 shrink-0"
          />
          <input
            v-else
            v-model.number="row.value"
            type="number"
            min="0"
            :step="model.mode === 'weights' ? '0.001' : '1'"
            class="w-28 rounded border p-1 text-right"
            :aria-label="`${people.find((p) => p.id === row.personId)?.name}の${model.mode === 'weights' ? '重み' : '金額'}`"
          />
        </div>
      </div>
      <p
        v-if="model.mode === 'fixed' && totalAmount !== undefined"
        :class="allocationTotal !== totalAmount ? 'text-red-700' : ''"
        aria-live="polite"
      >
        配分合計 {{ yen(allocationTotal) }} ／ 金額 {{ yen(totalAmount) }}
        <span v-if="allocationTotal !== totalAmount"
          >配分合計を金額と一致させてください。</span
        >
      </p>
    </template>
  </fieldset>
</template>
<script setup lang="ts">
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import type { FinanceLedger, LedgerAllocation } from "@offkai/core";
import { computed, ref, useId, watch } from "vue";
import MoneyExpressionInput from "@/common/components/MoneyExpressionInput.vue";
import { yen } from "../utils/ledger-display";

const radioName = useId();
const model = defineModel<LedgerAllocation>({ required: true });
const props = defineProps<{
  people: FinanceLedger["people"];
  label: string;
  memberIds?: string[];
  totalAmount?: number;
}>();
const allocationTotal = computed(() =>
  model.value.rows.reduce((sum, row) => sum + Number(row.value), 0),
);
const isCustom = () =>
  model.value.mode !== "weights" ||
  model.value.rows.some(
    (r) =>
      r.value !==
      ((props.memberIds ?? props.people.map((p) => p.id)).includes(r.personId)
        ? 1
        : 0),
  );
const custom = ref(isCustom());
watch(
  () => model.value,
  () => {
    custom.value = isCustom();
  },
);
function toggleCustom(checked: boolean) {
  custom.value = checked;
  if (!checked)
    model.value = {
      mode: "weights",
      rows: props.people.map((p) => ({
        personId: p.id,
        value: (props.memberIds ?? props.people.map((p) => p.id)).includes(p.id)
          ? 1
          : 0,
      })),
    };
}
</script>

<style scoped>
.allocation-row {
  display: flex;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
.allocation-row > input {
  width: 6rem;
  margin: 0;
  padding: 0.25rem 0.5rem !important;
  line-height: 1.25rem;
}
</style>
