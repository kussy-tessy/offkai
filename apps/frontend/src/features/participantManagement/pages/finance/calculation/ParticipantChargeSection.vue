<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-xl font-bold text-slate-900">参加者別計算</h2>
      <p class="mt-1 text-sm text-slate-600">
        一覧は確認用です。修正する参加者を選ぶと詳細が開きます。
      </p>
    </div>
    <div
      v-if="finance.participants.length === 0"
      class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500"
    >
      参加者はいません。
    </div>
    <div
      v-else
      class="overflow-x-auto rounded-xl border border-teal-100 shadow-sm"
    >
      <table class="w-full border-collapse text-xs sm:text-sm">
        <thead
          class="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50"
        >
          <tr>
            <th class="sticky left-0 z-20 bg-teal-50 px-2 py-2 text-left">
              名前
            </th>
            <th class="px-2 py-2 text-right">総請求額</th>
            <th
              v-for="category in finance.categories"
              :key="category.id"
              class="px-2 py-2 text-center"
            >
              {{ category.name }}
            </th>
            <th class="px-2 py-2 text-right">追加</th>
            <th class="px-2 py-2 text-left">備考</th>
            <th class="w-10 px-1 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(participant, index) in finance.participants"
            :key="participant.userId"
            class="category hover:bg-sky-50/60"
          >
            <td
              class="sticky left-0 z-10 border-b border-slate-100 px-2 py-2 font-medium text-slate-900 category-hover:bg-sky-50"
              :class="index % 2 ? 'bg-slate-50' : 'bg-white'"
            >
              {{ participant.displayName }}
            </td>
            <td
              class="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-right font-bold tabular-nums text-teal-800"
            >
              {{ money(participant.chargeAmount) }}
            </td>
            <td
              v-for="category in finance.categories"
              :key="category.id"
              class="border-b border-slate-100 px-2 py-2 text-center"
            >
              <template v-if="member(category.id, participant.userId)"
                ><span class="font-medium text-slate-800">{{
                  money(
                    member(category.id, participant.userId)!.effectiveAmount,
                  )
                }}</span
                ><span
                  v-if="
                    member(category.id, participant.userId)!.amountOverride !==
                    null
                  "
                  class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800"
                  >個別</span
                ></template
              ><span v-else class="text-slate-300">―</span>
            </td>
            <td
              class="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-right tabular-nums"
            >
              {{ money(extraTotal(participant)) }}
            </td>
            <td
              class="max-w-40 truncate border-b border-slate-100 px-2 py-2 text-slate-600"
              :title="participant.note ?? ''"
            >
              {{ participant.note || "―" }}
            </td>
            <td class="border-b border-slate-100 px-1 py-2 text-right">
              <button
                class="rounded p-1.5 text-teal-700 hover:bg-teal-50"
                :title="locked ? '詳細' : '編集'"
                :aria-label="`${participant.displayName}${locked ? 'の詳細' : 'を編集'}`"
                @click="selectedUserId = participant.userId"
              >
                <FontAwesomeIcon :icon="locked ? faEye : faPen" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ParticipantFinanceDrawer
      :participant="selectedParticipant"
      :categories="finance.categories"
      :saving-action="savingAction"
      :locked="locked"
      :on-close="closeDrawer"
      :save-member="saveSelectedMember"
      :add-extra="addSelectedExtra"
      :remove-extra="removeSelectedExtra"
      :save-note="saveSelectedNote"
    />
  </section>
</template>

<script setup lang="ts">
import { faEye, faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref } from "vue";
import ParticipantFinanceDrawer from "./ParticipantFinanceDrawer.vue";
import type { ExtraChargeInput, Finance, FinanceParticipant } from "./types";

const props = defineProps<{
  finance: Finance;
  savingAction: string | null;
  saveMember: (
    userId: string,
    categoryId: string,
    included: boolean,
    amountOverride: number | null,
  ) => Promise<boolean>;
  addExtra: (userId: string, input: ExtraChargeInput) => Promise<boolean>;
  removeExtra: (userId: string, extraChargeId: string) => Promise<boolean>;
  saveNote: (userId: string, note: string | null) => Promise<boolean>;
  readonly?: boolean;
}>();

const selectedUserId = ref<string | null>(null);
const locked = computed(() => props.readonly || props.finance.feeCalculationLockedAt !== null);
const selectedParticipant = computed(
  () =>
    props.finance.participants.find(
      (item) => item.userId === selectedUserId.value,
    ) ?? null,
);
const money = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
const member = (categoryId: string, userId: string) =>
  props.finance.categories
    .find((category) => category.id === categoryId)
    ?.members.find((item) => item.userId === userId);
const extraTotal = (participant: FinanceParticipant) =>
  participant.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
const requireSelectedUserId = () => {
  if (!selectedUserId.value) throw new Error("参加者が選択されていません。");
  return selectedUserId.value;
};
const closeDrawer = () => {
  selectedUserId.value = null;
};
const saveSelectedMember = (
  categoryId: string,
  included: boolean,
  amountOverride: number | null,
) =>
  props.saveMember(
    requireSelectedUserId(),
    categoryId,
    included,
    amountOverride,
  );
const addSelectedExtra = (input: ExtraChargeInput) =>
  props.addExtra(requireSelectedUserId(), input);
const removeSelectedExtra = (extraChargeId: string) =>
  props.removeExtra(requireSelectedUserId(), extraChargeId);
const saveSelectedNote = (note: string | null) =>
  props.saveNote(requireSelectedUserId(), note);
</script>
