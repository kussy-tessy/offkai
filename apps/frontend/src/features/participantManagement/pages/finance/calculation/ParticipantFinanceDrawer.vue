<template>
  <Teleport to="body">
    <div v-if="participant" class="fixed inset-0 z-40" @keydown.esc="onClose">
      <button class="absolute inset-0 bg-slate-950/40" aria-label="閉じる" @click="onClose" />
      <aside class="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl" role="dialog"
        aria-modal="true" :aria-labelledby="titleId">
        <header class="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p class="text-xs font-medium text-teal-700">参加費の個別修正</p>
            <h2 :id="titleId" class="mt-1 text-xl font-bold text-slate-900">
              {{ participant.displayName }}
            </h2>
          </div>
          <button class="rounded-md px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100" aria-label="閉じる"
            @click="onClose">
            ×
          </button>
        </header>

        <div class="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          <section>
            <h3 class="font-semibold text-slate-900">精算区分</h3>
            <p class="mt-1 text-sm text-slate-500">
              所属と、この参加者だけに適用する金額を変更できます。
            </p>
            <div v-if="categories.length === 0" class="mt-3 rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-500">
              精算区分がありません。
            </div>
            <div v-else class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              <div v-for="category in categories" :key="category.id" class="space-y-3 px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <label class="flex items-center gap-2 font-medium text-slate-800">
                    <input type="checkbox" class="h-4 w-4 accent-teal-600" :checked="memberOf(category.id)"
                      :disabled="saving || locked" @change="
                        toggleCategory(
                          category.id,
                          ($event.target as HTMLInputElement).checked,
                        )
                        " />
                    {{ category.name }}
                  </label>
                  <span class="text-sm text-slate-500">基本 {{ money(category.baseParticipationFeeAmount) }}</span>
                </div>
                <div v-if="memberOf(category.id)" class="flex flex-wrap items-end gap-2 pl-6">
                  <label class="min-w-48 flex-1 text-sm text-slate-600">
                    個別金額（空欄なら基本金額）
                    <input :value="overrideDrafts[category.id] ?? ''" type="number" min="0" step="1"
                      class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      :disabled="saving || locked" @input="
                        overrideDrafts[category.id] = (
                          $event.target as HTMLInputElement
                        ).value
                        " />
                  </label>
                  <MyButton size="sm" color="gray" variant="ghost" :disabled="saving || locked"
                    @click="saveOverride(category.id)">反映</MyButton>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 class="font-semibold text-slate-900">個別追加請求</h3>
            <div v-if="participant.extraCharges.length"
              class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              <div v-for="charge in participant.extraCharges" :key="charge.id"
                class="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p class="font-medium text-slate-800">
                    {{ charge.title }}
                    <span class="ml-1 text-teal-700">{{
                      money(charge.amount)
                      }}</span>
                  </p>
                  <p v-if="charge.note" class="mt-1 text-sm text-slate-500">
                    {{ charge.note }}
                  </p>
                </div>
                <button class="rounded p-1.5 text-rose-600 hover:bg-rose-50" :disabled="saving || locked" title="削除"
                  :aria-label="`${charge.title}を削除`" @click="removeExtra(charge.id)">
                  <FontAwesomeIcon :icon="faTrash" />
                </button>
              </div>
            </div>
            <div class="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <label class="text-sm text-slate-600">内容<input v-model="extraDraft.title" :disabled="locked"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  placeholder="例：帽子代" /></label>
              <label class="text-sm text-slate-600">金額<input v-model="extraDraft.amount" :disabled="locked"
                  type="number" min="0" step="1"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
              <label class="text-sm text-slate-600 sm:col-span-2">備考（任意）<input v-model="extraDraft.note"
                  :disabled="locked"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100" /></label>
              <div class="sm:col-span-2">
                <MyButton size="sm" :loading="savingAction === 'extra'" :disabled="saving || locked || !canAddExtra"
                  @click="addExtra">追加</MyButton>
              </div>
            </div>
          </section>

          <section>
            <h3 class="font-semibold text-slate-900">備考</h3>
            <textarea v-model="noteDraft" rows="3"
              class="mt-3 w-full resize-y rounded-md border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-100"
              :disabled="locked" placeholder="徴収時に確認したいことなど" />
            <MyButton class="mt-2" size="sm" color="gray" variant="ghost" :loading="savingAction === 'note'"
              :disabled="saving || locked" @click="saveNote">備考を保存</MyButton>
          </section>

          <section class="rounded-xl bg-gradient-to-r from-teal-50 to-sky-50 p-4">
            <h3 class="font-semibold text-slate-900">請求内訳</h3>
            <dl class="mt-3 space-y-2 text-sm">
              <div v-for="item in breakdown" :key="item.label" class="flex justify-between gap-4">
                <dt class="text-slate-600">{{ item.label }}</dt>
                <dd class="font-medium">{{ money(item.amount) }}</dd>
              </div>
              <div class="flex justify-between gap-4 border-t border-teal-200 pt-3 text-base">
                <dt class="font-bold">総請求額</dt>
                <dd class="font-bold text-teal-800">
                  {{ money(participant.chargeAmount) }}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { faTrash } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { computed, reactive, ref, watch } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import type {
    ExtraChargeInput,
    FinanceParticipant,
    SettlementCategory,
  } from "./types";

  const props = defineProps<{
    participant: FinanceParticipant | null;
    categories: SettlementCategory[];
    savingAction: string | null;
    locked: boolean;
    onClose: () => void;
    saveMember: (
      categoryId: string,
      included: boolean,
      amountOverride: number | null,
    ) => Promise<boolean>;
    addExtra: (input: ExtraChargeInput) => Promise<boolean>;
    removeExtra: (extraChargeId: string) => Promise<boolean>;
    saveNote: (note: string | null) => Promise<boolean>;
  }>();

  const titleId = "participant-finance-drawer-title";
  const overrideDrafts = reactive<Record<string, string>>({});
  const noteDraft = ref("");
  const extraDraft = reactive({ title: "", amount: "", note: "" });
  const saving = computed(() => props.savingAction !== null);
  const canAddExtra = computed(
    () =>
      extraDraft.title.trim() !== "" &&
      Number.isInteger(Number(extraDraft.amount)) &&
      Number(extraDraft.amount) >= 0,
  );

  const findMember = (categoryId: string) =>
    props.categories
      .find((category) => category.id === categoryId)
      ?.members.find((member) => member.userId === props.participant?.userId);
  const memberOf = (categoryId: string) => findMember(categoryId) !== undefined;
  const breakdown = computed(() => {
    if (!props.participant) return [];
    return [
      ...props.categories.flatMap((category) => {
        const member = findMember(category.id);
        return member
          ? [{ label: category.name, amount: member.effectiveAmount }]
          : [];
      }),
      ...props.participant.extraCharges.map((charge) => ({
        label: charge.title,
        amount: charge.amount,
      })),
    ];
  });
  const money = (amount: number) =>
    `${new Intl.NumberFormat("ja-JP").format(amount)}円`;

  const resetDrafts = () => {
    noteDraft.value = props.participant?.note ?? "";
    for (const key of Object.keys(overrideDrafts)) delete overrideDrafts[key];
    for (const category of props.categories) {
      const member = findMember(category.id);
      overrideDrafts[category.id] =
        member?.amountOverride === null || member === undefined
          ? ""
          : String(member.amountOverride);
    }
  };
  watch(() => [props.participant, props.categories] as const, resetDrafts, {
    immediate: true,
    deep: true,
  });

  const toggleCategory = (categoryId: string, included: boolean) =>
    void props.saveMember(categoryId, included, null);
  const saveOverride = (categoryId: string) => {
    const raw = overrideDrafts[categoryId]?.trim() ?? "";
    const amount = raw === "" ? null : Number(raw);
    if (amount !== null && (!Number.isInteger(amount) || amount < 0)) return;
    void props.saveMember(categoryId, true, amount);
  };
  const addExtra = async () => {
    if (!canAddExtra.value) return;
    const saved = await props.addExtra({
      title: extraDraft.title.trim(),
      amount: Number(extraDraft.amount),
      note: extraDraft.note.trim() || null,
    });
    if (saved) {
      extraDraft.title = "";
      extraDraft.amount = "";
      extraDraft.note = "";
    }
  };
  const removeExtra = (id: string) => void props.removeExtra(id);
  const saveNote = () => void props.saveNote(noteDraft.value.trim() || null);
</script>
