<template>
  <section class="space-y-5">
    <header class="space-y-3">
      <div>
        <h2 class="text-xl font-bold text-slate-900">参加費徴収</h2>
        <p class="mt-1 text-sm text-slate-600">
          満額を受け取ったらチェックしてください。徴収を始めるには、先に参加費を確定する必要があります。
        </p>
      </div>
      <label class="block text-sm text-slate-600"
        >名前検索<input
          :value="search"
          type="search"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
          placeholder="参加者名を入力"
          @input="onSearchInput"
      /></label>
      <nav
        class="flex border-b border-slate-200"
        aria-label="徴収状態の絞り込み"
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
    </header>

    <div v-if="loading" class="py-16 text-center text-sm text-slate-400">
      徴収情報を読み込み中…
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
    <template v-else-if="finance">
      <div
        v-if="!finance.feeCalculationLockedAt"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
      >
        参加費はまだ確定されていません。「参加費計算」画面で内容を確定すると徴収できます。
      </div>
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
              <th class="w-24 px-1 py-2 text-right">請求額</th>
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
                  participant.collectedAt
                    ? 'bg-emerald-50/40'
                    : 'hover:bg-sky-50/40'
                "
              >
                <td class="px-2 py-2 text-center align-middle">
                  <input
                    type="checkbox"
                    class="h-5 w-5 cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
                    :checked="participant.collectedAt !== null"
                    :disabled="
                      !canRecord || savingUserId !== null || !finance.feeCalculationLockedAt
                    "
                    :aria-label="`${participant.displayName}を徴収済みにする`"
                    @click.prevent="toggleCollection(participant)"
                  />
                </td>
                <td class="min-w-0 px-1 py-2 align-middle">
                  <p class="truncate font-medium text-slate-900">
                    {{ participant.displayName }}
                  </p>
                  <p
                    v-if="participant.note"
                    class="truncate text-xs text-rose-700"
                    :title="participant.note"
                  >
                    {{ participant.note }}
                  </p>
                  <p
                    v-else-if="participant.collectedAt"
                    class="truncate text-xs text-slate-400"
                  >
                    {{ format(participant.collectedAt) }}
                  </p>
                </td>
                <td
                  class="whitespace-nowrap px-1 py-2 text-right align-middle font-bold tabular-nums text-teal-800"
                >
                  {{ money(participant.chargeAmount) }}
                </td>
                <td class="px-1 py-2 text-center align-middle">
                  <button
                    class="rounded p-2 text-slate-500 hover:bg-slate-100"
                    :aria-label="`${participant.displayName}の請求内訳`"
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
                      v-for="item in breakdown(participant.userId)"
                      :key="`${item.kind}:${item.label}`"
                      class="flex justify-between gap-4"
                    >
                      <dt class="text-slate-600">
                        <span
                          v-if="item.kind === 'extra'"
                          class="mr-1 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700"
                          >追加</span
                        >{{ item.label }}
                      </dt>
                      <dd class="font-medium tabular-nums">
                        {{ money(item.amount) }}
                      </dd>
                    </div>
                    <div
                      v-if="breakdown(participant.userId).length === 0"
                      class="text-slate-400"
                    >
                      請求内訳はありません。
                    </div>
                    <div
                      class="flex justify-between border-t border-slate-200 pt-1.5"
                    >
                      <dt class="font-semibold">合計</dt>
                      <dd class="font-bold tabular-nums">
                        {{ money(participant.chargeAmount) }}
                      </dd>
                    </div>
                  </dl>
                  <p
                    v-if="participant.note"
                    class="mt-2 whitespace-pre-wrap rounded bg-white px-2 py-1.5 text-sm text-slate-600"
                  >
                    <span class="font-medium">備考：</span
                    >{{ participant.note }}
                  </p>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <MyConfirmDialog
      v-model:open="uncollectDialogOpen"
      title="徴収済みを解除しますか？"
      :message="
        uncollectTarget
          ? `${uncollectTarget.displayName}さんを未徴収に戻します。記録されている徴収日時も削除されます。`
          : ''
      "
      confirm-label="未徴収に戻す"
      confirm-color="red"
      :loading="savingUserId !== null"
      @confirm="confirmUncollect"
    />
  </section>
</template>

<script setup lang="ts">
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  format,
  type GetEventFinanceResponse,
  type Unbrand,
} from "@offkai/core";
import { computed, onMounted, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
import { useEventStaffAccess } from "@/features/participantManagement/composables/useEventStaffAccess";

type Finance = Unbrand<GetEventFinanceResponse>;
type Participant = Finance["participants"][number];
type Filter = "uncollected" | "collected" | "all";
const { eventId } = defineProps<{ eventId: string }>();
const { get, put } = useApi();
const toast = useToast();
const finance = ref<Finance | null>(null);
const loading = ref(true);
const loadError = ref("");
const search = ref("");
const filter = ref<Filter>("uncollected");
const savingUserId = ref<string | null>(null);
const { isOwner, permissions, loadAccess } = useEventStaffAccess(eventId);
const canRecord = computed(() => isOwner.value || permissions.value?.feeCollection === "record");
const expandedIds = ref(new Set<string>());

const onSearchInput = (event: Event) => {
  search.value = (event.target as HTMLInputElement).value;
};
const uncollectDialogOpen = ref(false);
const uncollectTarget = ref<Participant | null>(null);
const basePath = `/offkai-event/${eventId}/finance`;
const collectedCount = computed(
  () => finance.value?.participants.filter((p) => p.collectedAt).length ?? 0,
);
const uncollectedCount = computed(
  () => (finance.value?.participants.length ?? 0) - collectedCount.value,
);
const filterOptions = computed(() => [
  {
    value: "uncollected" as const,
    label: "未徴収",
    count: uncollectedCount.value,
  },
  {
    value: "collected" as const,
    label: "徴収済み",
    count: collectedCount.value,
  },
  {
    value: "all" as const,
    label: "すべて",
    count: finance.value?.participants.length ?? 0,
  },
]);
const visibleParticipants = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("ja");
  return (
    finance.value?.participants.filter(
      (p) =>
        (!query || p.displayName.toLocaleLowerCase("ja").includes(query)) &&
        (filter.value === "all" ||
          (filter.value === "collected"
            ? p.collectedAt !== null
            : p.collectedAt === null)),
    ) ?? []
  );
});
const money = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
const breakdown = (userId: string) => {
  const participant = finance.value?.participants.find(
    (p) => p.userId === userId,
  );
  if (!participant) return [];
  return [
    ...(finance.value?.categories.flatMap((category) => {
      const member = category.members.find((item) => item.userId === userId);
      return member
        ? [
            {
              kind: "category" as const,
              label: category.name,
              amount: member.effectiveAmount,
            },
          ]
        : [];
    }) ?? []),
    ...participant.extraCharges.map((charge) => ({
      kind: "extra" as const,
      label: charge.title,
      amount: charge.amount,
    })),
  ];
};
const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await get<Finance>(basePath);
    if (!result) throw new Error();
    finance.value = result;
  } catch (cause) {
    loadError.value = getApiErrorMessage(
      cause,
      "徴収情報を読み込めませんでした。",
    );
  } finally {
    loading.value = false;
  }
};
const toggleExpanded = (userId: string) => {
  const next = new Set(expandedIds.value);
  next.has(userId) ? next.delete(userId) : next.add(userId);
  expandedIds.value = next;
};
const toggleCollection = (participant: Participant) => {
  if (!finance.value?.feeCalculationLockedAt) return;
  if (participant.collectedAt) {
    uncollectTarget.value = participant;
    uncollectDialogOpen.value = true;
  } else {
    void saveCollection(participant.userId, true);
  }
};
const confirmUncollect = () => {
  if (uncollectTarget.value)
    void saveCollection(uncollectTarget.value.userId, false);
};
const saveCollection = async (userId: string, collected: boolean) => {
  if (savingUserId.value) return;
  savingUserId.value = userId;
  try {
    const result = await put<Finance>(
      `${basePath}/participants/${userId}/collection`,
      { collected },
    );
    if (!result) throw new Error();
    finance.value = result;
    if (!collected) {
      uncollectDialogOpen.value = false;
      uncollectTarget.value = null;
    }
    toast.success(collected ? "徴収済みにしました。" : "未徴収に戻しました。");
  } catch (cause) {
    toast.error(getApiErrorMessage(cause, "徴収状態を更新できませんでした。"));
  } finally {
    savingUserId.value = null;
  }
};
onMounted(() => void Promise.all([load(), loadAccess()]));
</script>
