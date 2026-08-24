<template>
  <section class="space-y-5">
    <header>
      <h2 class="text-xl font-bold text-slate-900">返金</h2>
      <p class="mt-1 text-sm text-slate-600">
        精算区分を参加者ごとに合算し、{{
          page?.refundRoundingUnit ?? "―"
        }}円単位で切り捨てて返金します。
      </p>
    </header>

    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">
      返金情報を読み込み中…
    </div>
    <div
      v-else-if="loadError"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      <p>{{ loadError }}</p>
      <MyButton
        class="mt-3"
        size="sm"
        color="gray"
        variant="ghost"
        @click="load"
        >再読み込み</MyButton
      >
    </div>

    <template v-else-if="page">
      <div
        v-if="page.refundLockedAt"
        class="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700"
      >
        <strong>返金を開始しています。</strong>
        返金額・経費・収入・切り捨て単位は変更できません。個人の返金済みチェックは解除できます。
      </div>
      <div
        v-if="completed"
        class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
      >
        <p class="font-bold">返金が完了しました</p>
        <p class="mt-1 text-sm">
          返金対象{{ refundableParticipants.length }}人・返金合計{{
            money(page.totalRefundAmount ?? 0)
          }}
        </p>
      </div>
      <div
        v-if="page.negativeParticipantNames.length"
        class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
      >
        <p class="font-bold">追加徴収が必要な参加者がいます。</p>
        <p class="mt-1">
          {{
            page.negativeParticipantNames.join("、")
          }}の最終精算がマイナスのため、返金額を計算できません。
        </p>
      </div>
      <div
        v-else-if="
          !page.canCalculate && !page.refundLockedAt && !page.refundCalculatedAt
        "
        class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
      >
        参加費を確定すると返金額を計算できます。
      </div>

      <section
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-900">返金計算</h3>
            <p v-if="page.refundCalculatedAt" class="mt-1 text-xs text-slate-500">
              {{ format(page.refundCalculatedAt) }}に計算
            </p>
          </div>
          <MyButton
            v-if="!page.refundLockedAt"
            size="sm"
            :disabled="!page.canCalculate || saving !== null"
            :loading="saving === 'calculate'"
            @click="calculate"
          >
            {{ page.refundCalculatedAt ? "返金額を再計算" : "返金額を計算" }}
          </MyButton>
        </div>
        <label class="mt-4 block text-sm text-slate-600">
          切り捨て単位
          <select
            :value="page.refundRoundingUnit"
            class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base disabled:bg-slate-100 disabled:text-slate-500 sm:w-48"
            :disabled="page.refundLockedAt !== null || saving !== null"
            @change="updateRoundingUnit"
          >
            <option :value="10">10円単位</option>
            <option :value="100">100円単位</option>
            <option :value="500">500円単位</option>
          </select>
        </label>
        <dl class="mt-4 divide-y divide-slate-100 text-sm">
          <div class="flex justify-between gap-3 py-2">
            <dt class="text-slate-600">切り捨て前返金原資</dt>
            <dd class="font-semibold tabular-nums">
              {{ money(page.totalUnroundedRefundAmount) }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 py-2">
            <dt class="text-slate-600">返金額合計</dt>
            <dd class="font-semibold tabular-nums">
              {{
                money(page.totalRefundAmount ?? page.proposedTotalRefundAmount)
              }}
            </dd>
          </div>
          <div
            class="flex justify-between gap-3 border-t border-slate-300 py-2"
          >
            <dt class="font-semibold text-slate-700">
              切り捨てによってイベントに残る金額
            </dt>
            <dd class="font-bold tabular-nums text-teal-800">
              {{ money(page.roundingRemainder) }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="space-y-3">
        <h3 class="font-bold text-slate-900">参加者ごとの返金</h3>
        <label class="block text-sm text-slate-600"
          >名前検索<input
            v-model="search"
            type="search"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
            placeholder="参加者名を入力"
        /></label>
        <nav
          class="flex border-b border-slate-200"
          aria-label="返金状態の絞り込み"
        >
          <button
            v-for="option in filterOptions"
            :key="option.value"
            class="-mb-px border-b-2 px-3 py-2 text-sm font-medium"
            :class="
              filter === option.value
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            "
            @click="filter = option.value"
          >
            {{ option.label }}
            <span class="ml-0.5 tabular-nums">{{ option.count }}</span>
          </button>
        </nav>

        <div
          v-if="visibleParticipants.length === 0"
          class="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500"
        >
          条件に該当する参加者はいません。
        </div>
        <div
          v-else
          class="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <table class="w-full table-fixed text-sm">
            <thead class="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th class="w-10 px-2 py-2 text-center">済</th>
                <th class="px-1 py-2">参加者</th>
                <th class="w-24 px-1 py-2 text-right">返金額</th>
                <th class="w-9 px-1 py-2"><span class="sr-only">内訳</span></th>
              </tr>
            </thead>
            <tbody>
              <template
                v-for="participant in visibleParticipants"
                :key="participant.userId"
              >
                <tr
                  class="border-t border-slate-100"
                  :class="
                    participant.refundedAt
                      ? 'bg-emerald-50/40'
                      : 'hover:bg-sky-50/40'
                  "
                >
                  <td class="px-2 py-2 text-center align-middle">
                    <input
                      v-if="displayRefundAmount(participant) > 0"
                      type="checkbox"
                      class="h-5 w-5 cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
                      :checked="participant.refundedAt !== null"
                      :disabled="
                        saving !== null || participant.refundAmount === null
                      "
                      :aria-label="`${participant.displayName}を返金済みにする`"
                      @click.prevent="toggleRefund(participant)"
                    />
                    <span v-else class="text-slate-300">―</span>
                  </td>
                  <td class="min-w-0 px-1 py-2 align-middle">
                    <p class="truncate font-medium text-slate-900">
                      {{ participant.displayName }}
                    </p>
                    <p
                      v-if="participant.refundedAt"
                      class="truncate text-xs text-slate-400"
                    >
                      {{ format(participant.refundedAt) }}
                    </p>
                    <p
                      v-else-if="displayRefundAmount(participant) === 0"
                      class="truncate text-xs text-slate-400"
                    >
                      返金なし
                    </p>
                  </td>
                  <td
                    class="whitespace-nowrap px-1 py-2 text-right align-middle font-bold tabular-nums text-teal-800"
                  >
                    {{ money(displayRefundAmount(participant)) }}
                  </td>
                  <td class="px-1 py-2 text-center align-middle">
                    <button
                      class="rounded p-2 text-slate-500 hover:bg-slate-100"
                      :aria-label="`${participant.displayName}の返金内訳`"
                      :aria-expanded="expandedIds.has(participant.userId)"
                      @click="toggleExpanded(participant.userId)"
                    >
                      <FontAwesomeIcon
                        :icon="
                          expandedIds.has(participant.userId)
                            ? faChevronUp
                            : faChevronDown
                        "
                      />
                    </button>
                  </td>
                </tr>
                <tr
                  v-if="expandedIds.has(participant.userId)"
                  class="border-t border-slate-100 bg-slate-50"
                >
                  <td colspan="4" class="px-3 py-3">
                    <dl class="space-y-1.5 text-sm">
                      <div
                        v-for="breakdown in participant.categoryBreakdowns"
                        :key="breakdown.categoryId"
                        class="flex justify-between gap-4"
                      >
                        <dt class="text-slate-600">
                          {{ breakdown.categoryName }}
                        </dt>
                        <dd class="font-medium tabular-nums">
                          {{ decimalMoney(breakdown.amount.displayAmount) }}
                        </dd>
                      </div>
                      <div
                        v-if="participant.categoryBreakdowns.length === 0"
                        class="text-slate-400"
                      >
                        返金内訳はありません。
                      </div>
                      <div
                        class="flex justify-between border-t border-slate-200 pt-1.5"
                      >
                        <dt class="font-semibold">切り捨て前合計</dt>
                        <dd class="font-bold tabular-nums">
                          {{
                            decimalMoney(
                              participant.unroundedTotal.displayAmount,
                            )
                          }}
                        </dd>
                      </div>
                      <div class="flex justify-between gap-4">
                        <dt class="text-slate-600">切り捨て額</dt>
                        <dd class="tabular-nums">
                          {{
                            decimalMoney(
                              participant.roundingDifference.displayAmount,
                            )
                          }}
                        </dd>
                      </div>
                      <div class="flex justify-between gap-4">
                        <dt class="font-semibold">返金額</dt>
                        <dd class="font-bold tabular-nums">
                          {{ money(displayRefundAmount(participant)) }}
                        </dd>
                      </div>
                    </dl>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <MyConfirmDialog
      v-model:open="startConfirmOpen"
      title="返金を開始しますか？"
      message="返金を開始すると、返金額・経費・収入・切り捨て単位を変更できなくなります。このロックは解除できません。"
      confirm-label="返金を開始"
      :loading="saving === 'toggle'"
      @confirm="confirmStartRefund"
    />
    <MyConfirmDialog
      v-model:open="unrefundDialogOpen"
      title="返金済みを解除しますか？"
      :message="
        unrefundTarget
          ? `${unrefundTarget.displayName}さんを未返金に戻します。記録されている返金日時も削除されます。返金ロックは解除されません。`
          : ''
      "
      confirm-label="未返金に戻す"
      confirm-color="red"
      :loading="saving === 'toggle'"
      @confirm="confirmUnrefund"
    />
  </section>
</template>

<script setup lang="ts">
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { format } from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
import type { RefundPage, RefundParticipant } from "./types";

type Filter = "unrefunded" | "refunded" | "all";

const { eventId } = defineProps<{ eventId: string }>();
const { get, post, put } = useApi();
const toast = useToast();
const basePath = `/offkai-event/${eventId}/finance/refunds`;
const page = ref<RefundPage | null>(null);
const loading = ref(true);
const loadError = ref("");
const saving = ref<"calculate" | "settings" | "toggle" | null>(null);
const startConfirmOpen = ref(false);
const pendingParticipant = ref<RefundParticipant | null>(null);
const unrefundDialogOpen = ref(false);
const unrefundTarget = ref<RefundParticipant | null>(null);
const search = ref("");
const filter = ref<Filter>("unrefunded");
const expandedIds = ref(new Set<string>());
const refundableParticipants = computed(
  () =>
    page.value?.participants.filter(
      (participant) => (participant.refundAmount ?? 0) > 0,
    ) ?? [],
);
const completed = computed(
  () =>
    refundableParticipants.value.length > 0 &&
    refundableParticipants.value.every(
      (participant) => participant.refundedAt !== null,
    ),
);
const refundedCount = computed(
  () =>
    page.value?.participants.filter((participant) => participant.refundedAt)
      .length ?? 0,
);
const unrefundedCount = computed(
  () =>
    page.value?.participants.filter(
      (participant) =>
        displayRefundAmount(participant) > 0 && participant.refundedAt === null,
    ).length ?? 0,
);
const filterOptions = computed(() => [
  {
    value: "unrefunded" as const,
    label: "未返金",
    count: unrefundedCount.value,
  },
  { value: "refunded" as const, label: "返金済み", count: refundedCount.value },
  {
    value: "all" as const,
    label: "すべて",
    count: page.value?.participants.length ?? 0,
  },
]);
const visibleParticipants = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("ja");
  return (
    page.value?.participants.filter(
      (participant) =>
        (!query ||
          participant.displayName.toLocaleLowerCase("ja").includes(query)) &&
        (filter.value === "all" ||
          (filter.value === "refunded"
            ? participant.refundedAt !== null
            : participant.refundedAt === null &&
              displayRefundAmount(participant) > 0)),
    ) ?? []
  );
});

const money = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
const decimalMoney = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(amount)}円`;
const displayRefundAmount = (participant: RefundParticipant) =>
  participant.refundAmount ?? participant.proposedRefundAmount;

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await get<RefundPage>(basePath);
    if (!result) throw new Error();
    page.value = result;
  } catch (cause) {
    loadError.value = getApiErrorMessage(
      cause,
      "返金情報を読み込めませんでした。",
    );
  } finally {
    loading.value = false;
  }
};
const calculate = async () => {
  if (saving.value) return;
  saving.value = "calculate";
  try {
    const result = await post<RefundPage>(`${basePath}/calculate`, {});
    if (!result) throw new Error();
    page.value = result;
    toast.success("返金額を計算しました。");
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "返金額を計算できませんでした。"));
  } finally {
    saving.value = null;
  }
};
const updateRoundingUnit = async (event: Event) => {
  if (!page.value || saving.value) return;
  const select = event.target as HTMLSelectElement;
  const previousUnit = page.value.refundRoundingUnit;
  const refundRoundingUnit = Number(
    select.value,
  ) as RefundPage["refundRoundingUnit"];
  if (refundRoundingUnit === previousUnit) return;
  saving.value = "settings";
  try {
    await put(`/offkai-event/${eventId}/finance/settings`, {
      refundRoundingUnit,
    });
    const result = await get<RefundPage>(basePath);
    if (!result) throw new Error();
    page.value = result;
    toast.success("切り捨て単位を変更しました。");
  } catch (cause) {
    select.value = String(previousUnit);
    toast.error(
      getApiErrorMessage(cause, "切り捨て単位を変更できませんでした。"),
    );
  } finally {
    saving.value = null;
  }
};
const toggleExpanded = (userId: string) => {
  const next = new Set(expandedIds.value);
  next.has(userId) ? next.delete(userId) : next.add(userId);
  expandedIds.value = next;
};
const toggleRefund = (participant: RefundParticipant) => {
  if (participant.refundedAt) {
    unrefundTarget.value = participant;
    unrefundDialogOpen.value = true;
    return;
  }
  if (!page.value?.refundLockedAt) {
    pendingParticipant.value = participant;
    startConfirmOpen.value = true;
    return;
  }
  void updateRefund(participant, true);
};
const confirmStartRefund = () => {
  if (!pendingParticipant.value) return;
  void updateRefund(pendingParticipant.value, true);
};
const confirmUnrefund = () => {
  if (unrefundTarget.value) void updateRefund(unrefundTarget.value, false);
};
const updateRefund = async (
  participant: RefundParticipant,
  refunded: boolean,
) => {
  if (saving.value) return;
  saving.value = "toggle";
  try {
    const result = await put<RefundPage>(`${basePath}/${participant.userId}`, {
      refunded,
    });
    if (!result) throw new Error();
    page.value = result;
    startConfirmOpen.value = false;
    pendingParticipant.value = null;
    if (!refunded) {
      unrefundDialogOpen.value = false;
      unrefundTarget.value = null;
    }
    toast.success(
      refunded ? "返金済みにしました。" : "返金済みを解除しました。",
    );
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "返金状態を更新できませんでした。"));
  } finally {
    saving.value = null;
  }
};

onMounted(() => void load());
</script>
