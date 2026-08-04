<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-600">
        参加可否を確認しながら、参加者ごとの金額と回収状況を入力できます。
      </p>
      <MyCheckbox
        v-if="questions.length > 0"
        :value="showCommitmentAnswers"
        :on-change="setShowCommitmentAnswers"
      >
        参加可否を表示
      </MyCheckbox>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">
      読み込み中…
    </div>

    <div v-else-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <p>{{ loadError }}</p>
      <MyButton class="mt-3" color="gray" variant="ghost" size="sm" @click="load">
        再読み込み
      </MyButton>
    </div>

    <div v-else-if="rows.length === 0" class="py-12 text-center text-sm text-gray-400">
      回答者はいません
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-teal-100 shadow-sm">
      <table class="w-full min-w-max border-collapse text-sm">
        <thead class="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-sky-50">
          <tr>
            <th class="sticky left-0 z-20 w-28 min-w-28 bg-teal-50 px-2 py-2 text-left">名前</th>
            <th
              v-for="question in visibleQuestions"
              :key="question.id"
              class="w-20 min-w-20 px-2 py-2 text-center"
            >
              {{ question.questionShort }}
            </th>
            <th class="w-32 min-w-32 px-2 py-2 text-center">金額</th>
            <th class="w-24 min-w-24 px-2 py-2 text-center">徴収済み</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in rows"
            :key="row.userId"
            class="group odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/50"
          >
            <td
              class="sticky left-0 z-10 border-b border-slate-100 px-2 py-2 font-medium text-slate-700 group-hover:bg-sky-50"
              :class="rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'"
            >
              {{ row.displayName }}
            </td>
            <td
              v-for="question in visibleQuestions"
              :key="question.id"
              class="border-b border-slate-100 px-2 py-2 text-center text-base"
            >
              <FontAwesomeIcon
                v-if="row.commitmentAnswers[question.id] === 'yes'"
                :icon="faCircle"
                class="text-sky-500"
                :aria-label="`${question.questionShort}：参加`"
              />
              <FontAwesomeIcon
                v-else-if="row.commitmentAnswers[question.id] === 'no'"
                :icon="faXmark"
                class="text-rose-500"
                :aria-label="`${question.questionShort}：不参加`"
              />
              <span v-else class="text-gray-400" :aria-label="`${question.questionShort}：未回答`">―</span>
            </td>
            <td class="border-b border-slate-100 px-2 py-2 text-center align-middle">
              <PaymentAmountInput
                :input-id="amountInputId(row.userId)"
                :display-name="row.displayName"
                :value="row.amount"
                :disabled="row.savingField !== null && row.savingField !== 'amount'"
                :save="amount => saveRow(row, { amount }, 'amount')"
                @navigate="direction => focusRelativeAmount(rowIndex, direction)"
              />
              <p v-if="row.savingField === 'amount'" class="mt-1 text-xs text-teal-700">保存中…</p>
              <p v-else-if="row.saved" class="mt-1 text-xs text-emerald-700">保存しました</p>
              <p v-if="row.error" class="mt-1 max-w-36 text-xs text-red-600">{{ row.error }}</p>
            </td>
            <td class="border-b border-slate-100 px-2 py-2 text-center align-middle">
              <MyAsyncCheckbox
                class="flex justify-center"
                :value="row.collected"
                :disabled="row.savingField !== null"
                :save="value => saveRow(row, { collected: value }, 'collected')"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { faCircle } from "@fortawesome/free-regular-svg-icons";
  import { faXmark } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import type {
    GetParticipantPaymentsResponse,
    Unbrand,
    UpdateParticipantPaymentResponse,
  } from "@offkai/core";
  import { computed, onMounted, ref } from "vue";
  import MyAsyncCheckbox from "@/common/components/MyAsyncCheckbox.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyCheckbox from "@/common/components/MyCheckbox.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
  import PaymentAmountInput from "./PaymentAmountInput.vue";

  const SHOW_COMMITMENT_STORAGE_KEY = "participant-payments:show-commitment-answers";

  const { eventId } = defineProps<{
    eventId: string;
  }>();

  type Participant = Unbrand<GetParticipantPaymentsResponse>["participants"][number];
  type SavingField = "amount" | "collected";
  type PaymentRow = Participant & {
    savingField: SavingField | null;
    saved: boolean;
    error: string;
  };

  const { get, put } = useApi();
  const { error: showError } = useToast();
  const loading = ref(true);
  const loadError = ref("");
  const questions = ref<Unbrand<GetParticipantPaymentsResponse>["commitmentQuestions"]>([]);
  const rows = ref<PaymentRow[]>([]);
  const showCommitmentAnswers = ref(false);

  const visibleQuestions = computed(() =>
    showCommitmentAnswers.value ? questions.value : [],
  );

  const initializeCommitmentVisibility = () => {
    const stored = localStorage.getItem(SHOW_COMMITMENT_STORAGE_KEY);
    showCommitmentAnswers.value = stored === null
      ? window.matchMedia("(min-width: 640px)").matches
      : stored === "true";
  };

  const setShowCommitmentAnswers = (value: boolean) => {
    showCommitmentAnswers.value = value;
    localStorage.setItem(SHOW_COMMITMENT_STORAGE_KEY, String(value));
  };

  const load = async () => {
    loading.value = true;
    loadError.value = "";
    try {
      const result = await get<Unbrand<GetParticipantPaymentsResponse>>(
        `/offkai-event/${eventId}/participant-payments`,
      );
      if (!result) throw new Error("金銭管理情報を取得できませんでした。");
      questions.value = result.commitmentQuestions;
      rows.value = result.participants.map(participant => ({
        ...participant,
        savingField: null,
        saved: false,
        error: "",
      }));
    } catch (cause) {
      loadError.value = getApiErrorMessage(cause, "金銭管理情報の読み込みに失敗しました。");
    } finally {
      loading.value = false;
    }
  };

  const saveRow = async (
    row: PaymentRow,
    changes: Partial<Pick<Participant, "amount" | "collected">>,
    field: SavingField,
  ) => {
    if (row.savingField !== null) throw new Error("更新中です。");
    row.savingField = field;
    row.saved = false;
    row.error = "";
    try {
      const updated = await put<Unbrand<UpdateParticipantPaymentResponse>>(
        `/offkai-event/${eventId}/participant-payments/${row.userId}`,
        {
          amount: changes.amount ?? row.amount,
          collected: changes.collected ?? row.collected,
        },
      );
      if (!updated) throw new Error("金銭管理情報を更新できませんでした。");
      Object.assign(row, updated);
      row.saved = true;
      setTimeout(() => {
        row.saved = false;
      }, 2000);
      return updated;
    } catch (cause) {
      row.error = getApiErrorMessage(cause, "金銭管理情報の更新に失敗しました。");
      showError(row.error);
      throw cause;
    } finally {
      row.savingField = null;
    }
  };

  const amountInputId = (userId: string) => `participant-payment-amount-${userId}`;
  const focusRelativeAmount = (index: number, direction: 1 | -1) => {
    const target = rows.value[index + direction];
    if (!target) return;
    document.getElementById(amountInputId(target.userId))?.focus();
  };

  onMounted(() => {
    initializeCommitmentVisibility();
    void load();
  });
</script>
