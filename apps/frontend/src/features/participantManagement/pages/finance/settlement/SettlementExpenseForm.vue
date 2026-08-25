<template>
  <form class="space-y-4 rounded-lg border border-teal-200 bg-teal-50/40 p-4" @submit.prevent="submit">
    <div class="flex items-center justify-between gap-3">
      <h4 class="font-semibold text-slate-900">
        {{ expense ? "経費を編集" : "経費を追加" }}
      </h4>
      <button type="button" class="text-sm text-slate-500 hover:underline" @click="onCancel">
        閉じる
      </button>
    </div>
    <div class="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
      <button type="button" class="rounded-md px-3 py-2 text-sm font-medium" :class="kind === 'normal'
        ? 'bg-white text-teal-800 shadow-sm'
        : 'text-slate-500'
        " @click="setKind('normal')">
        通常経費
      </button>
      <button type="button" class="rounded-md px-3 py-2 text-sm font-medium" :class="kind === 'recipient'
        ? 'bg-white text-teal-800 shadow-sm'
        : 'text-slate-500'
        " @click="setKind('recipient')">
        受取人がいる経費
      </button>
    </div>
    <label class="block text-sm text-slate-600">内容<input v-model="title" required maxlength="100"
        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="例：更衣室代、車出し協力金" /></label>
    <MoneyExpressionInput v-if="kind === 'normal'" ref="normalAmountInput" v-model="normalAmount" label="金額"
      required />

    <section v-else class="space-y-3">
      <div class="relative">
        <button type="button"
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700"
          @click="recipientPickerOpen = !recipientPickerOpen">
          受取人を選択（{{ recipientDrafts.length }}人）
        </button>
        <div v-if="recipientPickerOpen"
          class="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          <input v-model="recipientSearch" type="search"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="名前で検索" />
          <div class="mt-2 max-h-52 overflow-y-auto">
            <label v-for="participant in filteredParticipants" :key="participant.userId"
              class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-50"><input
                type="checkbox" class="h-4 w-4 accent-teal-600" :checked="isSelected(participant.userId)" @change="
                  toggleRecipient(
                    participant.userId,
                    ($event.target as HTMLInputElement).checked,
                  )
                  " />{{ participant.displayName }}</label>
            <p v-if="filteredParticipants.length === 0" class="px-2 py-3 text-sm text-slate-400">
              該当者はいません。
            </p>
          </div>
          <button type="button" class="mt-2 w-full rounded-md bg-slate-100 px-3 py-2 text-sm"
            @click="recipientPickerOpen = false">
            選択を完了
          </button>
        </div>
      </div>
      <div v-if="recipientDrafts.length === 0" class="rounded-md bg-white px-3 py-3 text-sm text-amber-700">
        受取人を1人以上選択してください。
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <MyBadge v-for="recipient in recipientDrafts" :key="recipient.userId" size="sm">
          <span class="inline-flex min-w-0 items-center gap-1">
            <span class="truncate">{{ participantName(recipient.userId) }}</span>
            <button type="button"
              class="-mr-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-slate-300 leading-none hover:bg-teal-200 hover:text-slate-700"
              :aria-label="`${participantName(recipient.userId)}を選択解除`"
              @click="toggleRecipient(recipient.userId, false)">
              ×
            </button>
          </span>
        </MyBadge>
      </div>
      <MoneyExpressionInput ref="cooperationAmountInput" v-model="cooperationAmount" label="1人あたりの協力金"
        suffix="円" align="right" required />
      <p class="text-right text-sm font-medium text-slate-700">
        {{ money(cooperationAmount ?? 0) }} ×
        {{ recipientDrafts.length }}人 ＝ {{ money(recipientTotal) }}
      </p>
    </section>

    <label class="block text-sm text-slate-600">備考（任意）<textarea v-model="note" rows="2"
        class="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2" />
    </label>
    <div class="flex justify-end gap-2">
      <MyButton type="button" size="sm" color="gray" variant="ghost" :disabled="saving" @click="onCancel">キャンセル
      </MyButton>
      <MyButton type="submit" size="sm" :loading="saving" :disabled="!valid || saving">保存</MyButton>
    </div>
  </form>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue";
  import MyBadge from "@/common/components/MyBadge.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MoneyExpressionInput from "@/common/components/MoneyExpressionInput.vue";
  import type {
    SettlementExpense,
    SettlementExpenseInput,
    SettlementPage,
  } from "./types";

  const props = defineProps<{
    categoryId: string;
    expense: SettlementExpense | null;
    participants: SettlementPage["participants"];
    saving: boolean;
    save: (
      input: SettlementExpenseInput,
      expenseId: string | null,
    ) => Promise<boolean>;
    onCancel: () => void;
  }>();

  const kind = ref<"normal" | "recipient">(
    props.expense?.recipients.length ? "recipient" : "normal",
  );
  const title = ref(props.expense?.title ?? "");
  const normalAmount = ref<number | null>(
    props.expense && props.expense.recipients.length === 0
      ? props.expense.amount
      : null,
  );
  const note = ref(props.expense?.note ?? "");
  const recipientPickerOpen = ref(false);
  const recipientSearch = ref("");
  const cooperationAmount = ref<number | null>(
    props.expense?.recipients[0]
      ? props.expense.recipients[0].amount
      : null,
  );
  const recipientDrafts = ref(
    (props.expense?.recipients ?? []).map((recipient) => ({
      userId: recipient.userId,
    })),
  );

  type MoneyExpressionInputInstance = InstanceType<typeof MoneyExpressionInput>;
  const normalAmountInput = ref<MoneyExpressionInputInstance | null>(null);
  const cooperationAmountInput = ref<MoneyExpressionInputInstance | null>(null);

  const filteredParticipants = computed(() => {
    const query = recipientSearch.value.trim().toLocaleLowerCase("ja");
    return props.participants.filter(
      (participant) =>
        !query || participant.displayName.toLocaleLowerCase("ja").includes(query),
    );
  });
  const recipientTotal = computed(
    () => recipientDrafts.value.length * (cooperationAmount.value ?? 0),
  );
  const valid = computed(() => {
    if (!title.value.trim()) return false;
    if (kind.value === "normal")
      return (
        Number.isInteger(normalAmount.value) && (normalAmount.value ?? 0) > 0
      );
    return (
      recipientDrafts.value.length > 0 &&
      Number.isInteger(cooperationAmount.value) &&
      (cooperationAmount.value ?? 0) > 0
    );
  });
  const money = (amount: number) =>
    `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
  const participantName = (userId: string) =>
    props.participants.find((participant) => participant.userId === userId)
      ?.displayName ?? "不明な参加者";
  const isSelected = (userId: string) =>
    recipientDrafts.value.some((recipient) => recipient.userId === userId);
  const toggleRecipient = (userId: string, selected: boolean) => {
    recipientDrafts.value = selected
      ? [...recipientDrafts.value, { userId }]
      : recipientDrafts.value.filter((recipient) => recipient.userId !== userId);
  };
  const setKind = (next: "normal" | "recipient") => {
    kind.value = next;
    recipientPickerOpen.value = false;
  };
  const submit = async () => {
    const amount =
      kind.value === "normal"
        ? (normalAmountInput.value?.evaluate() ?? null)
        : (cooperationAmountInput.value?.evaluate() ?? null);
    if (!valid.value) return;
    const recipients =
      kind.value === "recipient"
        ? recipientDrafts.value.map((recipient) => ({
          userId: recipient.userId,
          amount: amount as number,
        }))
        : [];
    const saved = await props.save(
      {
        categoryId: props.categoryId,
        title: title.value.trim(),
        amount: kind.value === "normal" ? amount : null,
        note: note.value.trim() || null,
        recipients,
      },
      props.expense?.id ?? null,
    );
    if (saved) props.onCancel();
  };
</script>
