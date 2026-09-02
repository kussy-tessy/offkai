<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-xl font-bold text-slate-900">参加者別計算</h2>
      <p class="mt-1 text-sm text-slate-600">
        全区分を合算し、切り捨て後の返金予定額を参加者ごとに表示します。
      </p>
    </div>
    <div
      v-if="participants.length === 0"
      class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500"
    >
      参加者はいません。
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-teal-100 shadow-sm">
      <table class="w-full border-collapse text-xs sm:text-sm">
        <thead class="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50">
          <tr>
            <th class="sticky left-0 z-20 bg-teal-50 px-2 py-2 text-left">名前</th>
            <th class="px-2 py-2 text-right">返金額</th>
            <th v-for="category in categories" :key="category.id" class="px-2 py-2 text-right">
              {{ category.name }}
            </th>
            <th class="px-2 py-2 text-left">備考</th>
            <th class="w-10 px-1 py-2"><span class="sr-only">詳細</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(participant, index) in participants" :key="participant.userId" class="hover:bg-sky-50/60">
            <td
              class="sticky left-0 z-10 border-b border-slate-100 px-2 py-2 font-medium text-slate-900"
              :class="index % 2 ? 'bg-slate-50' : 'bg-white'"
            >
              {{ participant.displayName }}
            </td>
            <td
              class="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-right font-bold tabular-nums"
              :class="participant.proposedRefundAmount < 0 ? 'text-rose-700' : 'text-teal-800'"
            >
              {{ money(participant.proposedRefundAmount) }}
            </td>
            <td
              v-for="category in categories"
              :key="category.id"
              class="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-right tabular-nums"
            >
              {{ decimalMoney(categoryAmount(participant, category.id)) }}
            </td>
            <td
              class="max-w-40 truncate border-b border-slate-100 px-2 py-2 text-slate-600"
              :title="participant.settlementNote ?? ''"
            >
              {{ participant.settlementNote || "―" }}
            </td>
            <td class="border-b border-slate-100 px-1 py-2 text-right">
              <button
                class="rounded p-1.5 text-teal-700 hover:bg-teal-50"
                :aria-label="`${participant.displayName}${locked ? 'の詳細' : 'を編集'}`"
                @click="select(participant)"
              >
                <FontAwesomeIcon :icon="locked ? faEye : faPen" />
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot class="border-t-2 border-teal-200 bg-teal-50/80 font-bold">
          <tr>
            <th class="sticky left-0 z-10 bg-teal-50 px-2 py-2 text-left" scope="row">合計</th>
            <td class="px-2 py-2 text-right tabular-nums text-teal-800">{{ money(totalRefund) }}</td>
            <td v-for="category in categories" :key="category.id" class="px-2 py-2 text-right tabular-nums">
              {{ decimalMoney(categoryTotal(category.id)) }}
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-if="selected" class="fixed inset-0 z-40 bg-slate-900/30" @click.self="selected = null">
      <aside class="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl" role="dialog" aria-modal="true">
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p class="text-xs font-medium text-teal-700">返金額の個別確認</p>
            <h3 class="font-bold text-slate-900">{{ selected.displayName }}</h3>
          </div>
          <button class="rounded p-2 text-slate-500 hover:bg-slate-100" aria-label="閉じる" @click="selected = null">×</button>
        </header>
        <div class="flex-1 space-y-5 overflow-y-auto p-4">
          <dl class="space-y-2 text-sm">
            <div v-for="breakdown in selected.categoryBreakdowns" :key="breakdown.categoryId" class="flex justify-between gap-3">
              <dt class="text-slate-600">{{ breakdown.categoryName }}</dt>
              <dd class="font-medium tabular-nums">{{ decimalMoney(breakdown.amount.displayAmount) }}</dd>
            </div>
            <div class="flex justify-between border-t border-slate-200 pt-2">
              <dt class="font-semibold">切り捨て前合計</dt>
              <dd class="font-semibold tabular-nums">{{ decimalMoney(selected.unroundedTotal.displayAmount) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="font-bold">返金額</dt>
              <dd class="font-bold tabular-nums text-teal-800">{{ money(selected.proposedRefundAmount) }}</dd>
            </div>
          </dl>
          <form @submit.prevent="submitNote">
            <label class="block text-sm font-medium text-slate-700">
              経費精算時の備考
              <textarea v-model="note" rows="4" :disabled="locked || saving" class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100"></textarea>
            </label>
            <MyButton v-if="!locked" class="mt-3" type="submit" :disabled="saving">備考を保存</MyButton>
          </form>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { faEye, faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import type { SettlementPage } from "./types";

type Participant = SettlementPage["participants"][number];
const props = defineProps<{
  participants: SettlementPage["participants"];
  categories: SettlementPage["categories"];
  locked: boolean;
  saving: boolean;
  saveNote: (userId: string, note: string | null) => Promise<boolean>;
}>();
const selected = ref<Participant | null>(null);
const note = ref("");
const select = (participant: Participant) => {
  selected.value = participant;
  note.value = participant.settlementNote ?? "";
};
const money = (amount: number) => `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
const decimalMoney = (amount: number) => `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(amount)}円`;
const categoryAmount = (participant: Participant, categoryId: string) =>
  participant.categoryBreakdowns.find((item) => item.categoryId === categoryId)?.amount.displayAmount ?? 0;
const totalRefund = computed(() => props.participants.reduce((sum, item) => sum + item.proposedRefundAmount, 0));
const categoryTotal = (categoryId: string) => props.participants.reduce((sum, item) => sum + categoryAmount(item, categoryId), 0);
const submitNote = async () => {
  if (!selected.value) return;
  const value = note.value.trim() || null;
  if (await props.saveNote(selected.value.userId, value)) {
    selected.value = null;
  }
};
</script>
