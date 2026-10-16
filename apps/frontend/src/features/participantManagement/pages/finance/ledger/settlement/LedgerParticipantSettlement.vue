<template>
  <div class="table-wrap">
    <table
      class="participant-table numeric-columns"
      aria-label="個人別の返金額"
    >
      <thead>
        <tr>
          <th class="person-column">参加者</th>
          <th>返金総額</th>
          <th
            v-for="c in page.state.categories"
            :key="c.id"
          >
            {{ c.name }}
          </th>
          <th>端数処理前の<br />合計</th>
          <th>調整額</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in page.calculation.participants"
          :key="p.id"
        >
          <td class="person-column">
            <MyButton
              class="person-button"
              size="sm"
              variant="ghost"
              :aria-expanded="selectedId === p.id"
              @click="selectedId = selectedId === p.id ? null : p.id"
              ><span
                class="person-name"
                :title="p.name"
                >{{ p.name }}</span
              ></MyButton
            >
          </td>
          <td class="text-right whitespace-nowrap font-semibold">
            {{ formatIntegerAmount(p.proposedRefund) }}
          </td>
          <td
            v-for="c in page.state.categories"
            :key="c.id"
            class="whitespace-nowrap text-right"
          >
            {{ formatAmount(groups[p.id][c.id].refund) }}
          </td>
          <td class="text-right whitespace-nowrap">
            {{ formatAmount(beforeRounding(p.id)) }}
          </td>
          <td class="min-w-28">
            <div class="flex items-center justify-end gap-2">
              <span>{{
                formatIntegerAmount(p.proposedRefund - p.automatic)
              }}</span
              ><MyButton
                v-if="can('settlement', 'edit')"
                size="sm"
                variant="ghost"
                :disabled="!editable"
                :aria-label="`${p.name}の調整`"
                title="調整"
                class="!border-0 !p-1"
                @click="emit('adjust', p.id)"
                ><FontAwesomeIcon :icon="faPen"
              /></MyButton>
            </div>
            <template v-if="adjustments[p.id]">
              <p
                class="caption"
                v-if="adjustments[p.id].mode === 'fixed'"
              >
                返金総額指定 {{ formatIntegerAmount(adjustments[p.id].amount) }}
              </p>
              <p class="caption">{{ adjustments[p.id].note }}</p>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <section
    v-if="selected"
    class="rounded-xl border border-teal-100 bg-slate-50 p-4 space-y-4"
    aria-label="個人別の精算内訳"
  >
    <h4 class="font-bold break-all">{{ selected.name }}の内訳</h4>
    <div class="grid grid-cols-2 gap-3 text-sm">
      <p>
        参加費（予定）<strong class="block">{{ yen(selected.charged) }}</strong>
      </p>
      <p>
        参加費（受領済）<strong class="block">{{
          yen(selected.received)
        }}</strong>
      </p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <section
        v-for="c in page.state.categories"
        :key="c.id"
        class="rounded-lg border bg-white p-3 space-y-2"
      >
        <h5 class="font-semibold text-teal-800 border-b pb-2">{{ c.name }}</h5>
        <p class="flex justify-between text-sm">
          <span>参加費（予定）</span
          ><span>{{ yen(groups[selected.id][c.id].charged) }}</span>
        </p>
        <p
          v-for="(row, index) in groups[selected.id][c.id].rows"
          :key="index"
          class="flex justify-between gap-3 text-sm"
        >
          <span
            ><MyBadge
              size="sm"
              class="mr-1"
              :color="badgeColors[row.kind] ?? 'gray'"
              >{{ labels[row.kind] ?? row.kind }}</MyBadge
            >{{ row.title
            }}<span
              v-if="row.weight !== undefined && row.weight !== 1"
              class="ml-1 text-xs text-slate-400"
              >({{ row.weight }}口)</span
            ><span
              v-else-if="
                row.weight === undefined &&
                (row.kind === 'expense' || row.kind === 'income')
              "
              class="ml-1 text-xs text-slate-400"
              >(金額指定)</span
            ></span
          ><span class="whitespace-nowrap">{{
            signed(row.kind === "expense" ? -row.amount : row.amount)
          }}</span>
        </p>
        <p class="flex justify-between border-t pt-2 text-sm font-semibold">
          <span>返金（端数処理前）</span
          ><span>{{ yen(groups[selected.id][c.id].refund) }}</span>
        </p>
      </section>
    </div>
    <dl class="border-t pt-3 space-y-2 text-sm">
      <div class="flex justify-between gap-3">
        <dt>端数処理前の返金総額</dt>
        <dd>{{ yen(beforeRounding(selected.id)) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>端数処理</dt>
        <dd>{{ signed(rounding(selected)) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt>手動調整</dt>
        <dd>{{ signed(selected.proposedRefund - selected.automatic) }}</dd>
      </div>
      <div class="flex justify-between gap-3 border-t pt-2 font-semibold">
        <dt>返金総額</dt>
        <dd>{{ yen(selected.proposedRefund) }}</dd>
      </div>
    </dl>
    <dl class="border-t pt-3 space-y-2 text-sm">
      <div
        v-if="selected.received !== selected.charged"
        class="flex justify-between"
      >
        <dt>
          {{
            selected.received < selected.charged
              ? "参加費（未徴収）"
              : "参加費（過徴収）"
          }}
        </dt>
        <dd>{{ signed(selected.received - selected.charged) }}</dd>
      </div>
      <div
        v-if="selected.recovered"
        class="flex justify-between"
      >
        <dt>追加徴収済み</dt>
        <dd>{{ signed(selected.recovered) }}</dd>
      </div>
      <div class="flex justify-between">
        <dt>返金済み</dt>
        <dd>{{ signed(-selected.refunded) }}</dd>
      </div>
      <div class="flex justify-between font-semibold">
        <dt>今の差額</dt>
        <dd>
          {{
            selected.remaining === null
              ? "未配分あり"
              : balanceText(selected.remaining)
          }}
        </dd>
      </div>
    </dl>
  </section>
</template>
<script setup lang="ts">
import { buildParticipantCategories } from "./settlement-view-model";
import type { LedgerPage } from "@offkai/core";
import { computed, ref } from "vue";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import type { BadgeColor } from "@/common/components/MyBadge.colors";
import MyBadge from "@/common/components/MyBadge.vue";
import MyButton from "@/common/components/MyButton.vue";
import { balanceText, yen } from "../utils/ledger-display";
import type { LedgerPanelEvents } from "../types/ledger-panel-events";
import { useLedgerSession } from "../composables/useLedgerSession";

const formatIntegerAmount = (amount: number | null) =>
  amount === null ? "—" : amount.toLocaleString("ja-JP");
const formatAmount = (amount: number | null) =>
  amount === null
    ? "—"
    : amount.toLocaleString("ja-JP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const props = defineProps<{ page: LedgerPage }>();
const emit = defineEmits<{
  adjust: [id: string];
  remove: LedgerPanelEvents["remove"];
}>();
const { can, editable } = useLedgerSession();
const selectedId = ref<string | null>(null);
const selected = computed(() =>
  props.page.calculation.participants.find((p) => p.id === selectedId.value),
);
const adjustments = computed(() =>
  Object.fromEntries(props.page.state.adjustments.map((a) => [a.personId, a])),
);
const labels: Record<string, string> = {
  expense: "経費",
  income: "負担軽減",
  cooperation: "協力金",
  reimbursement: "立替返済",
};
const badgeColors: Record<string, BadgeColor> = {
  expense: "yellow",
  cooperation: "blue",
  income: "purple",
  reimbursement: "gray",
};
const groups = computed(() => buildParticipantCategories(props.page));
const signed = (amount: number) => `${amount > 0 ? "+" : ""}${yen(amount)}`;
const beforeRounding = (id: string) =>
  Object.values(groups.value[id]).reduce((sum, g) => sum + g.refund, 0);
function rounding(p: LedgerPage["calculation"]["participants"][number]) {
  const value =
    p.automatic -
    Object.values(groups.value[p.id]).reduce((sum, g) => sum + g.refund, 0);
  return Math.abs(value) < 1e-8 ? 0 : value;
}
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
