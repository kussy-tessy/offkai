<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-slate-900">精算区分</h2>
        <p class="mt-1 text-sm text-slate-600">
          区分の基本金額と、割当に使う参加可否質問を設定します。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <MyButton
          size="sm"
          color="gray"
          variant="ghost"
          :disabled="
            savingAction !== null || finance.categories.length === 0 || locked
          "
          @click="syncDialogOpen = true"
          >参加回答から割当を更新</MyButton
        >
        <MyButton
          size="sm"
          :disabled="savingAction !== null || locked"
          @click="startCreate"
          >区分を追加</MyButton
        >
      </div>
    </div>

    <form
      v-if="editing"
      class="grid gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 md:grid-cols-[1fr_11rem_1fr_auto]"
      @submit.prevent="submitCategory"
    >
      <label class="text-sm text-slate-600"
        >区分名<input
          v-model="draft.name"
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          required
          maxlength="100"
          placeholder="例：ロケ"
      /></label>
      <label class="text-sm text-slate-600"
        >基本金額<input
          v-model="draft.baseParticipationFeeAmount"
          type="number"
          min="0"
          step="1"
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          required
      /></label>
      <label class="text-sm text-slate-600"
        >参加可否質問
        <select
          v-model="draft.commitmentQuestionId"
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">関連付けなし</option>
          <option
            v-for="question in finance.questions"
            :key="question.id"
            :value="question.id"
          >
            {{ question.questionShort
            }}{{ question.archived ? "（アーカイブ済み）" : "" }}
          </option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <MyButton
          type="submit"
          size="sm"
          :loading="savingAction === 'category'"
          :disabled="!validDraft || savingAction !== null"
          >{{ editingCategoryId ? "更新" : "追加" }}</MyButton
        >
        <MyButton
          type="button"
          size="sm"
          color="gray"
          variant="ghost"
          :disabled="savingAction !== null"
          @click="cancelEdit"
          >取消</MyButton
        >
      </div>
    </form>

    <div
      v-if="finance.categories.length === 0"
      class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500"
    >
      精算区分がありません。「区分を追加」から作成してください。
    </div>
    <div v-else class="rounded-xl border border-slate-200 shadow-sm">
      <table class="w-full table-fixed text-sm">
        <thead
          class="bg-gradient-to-r from-teal-50 to-sky-50 text-left text-slate-700"
        >
          <tr>
            <th class="px-2 py-2">区分名</th>
            <th class="w-24 px-2 py-2 text-right">基本金額</th>
            <th class="px-2 py-2">参加可否質問</th>
            <th class="w-16 px-2 py-2 text-right">人数</th>
            <th class="w-16 px-1 py-2"><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="category in finance.categories"
            :key="category.id"
            class="hover:bg-slate-50"
          >
            <td
              class="truncate px-2 py-2 font-medium text-slate-900"
              :title="category.name"
            >
              {{ category.name }}
            </td>
            <td class="px-2 py-2 text-right tabular-nums">
              {{ money(category.baseParticipationFeeAmount) }}
            </td>
            <td
              class="truncate px-2 py-2 text-slate-600"
              :title="questionLabel(category.commitmentQuestionId)"
            >
              {{ questionLabel(category.commitmentQuestionId) }}
            </td>
            <td class="px-2 py-2 text-right tabular-nums">
              {{ category.members.length }}
            </td>
            <td class="whitespace-nowrap px-1 py-2 text-right">
              <button
                class="rounded p-1.5 text-teal-700 hover:bg-teal-50 disabled:text-slate-300"
                title="編集"
                :disabled="locked"
                :aria-label="`${category.name}を編集`"
                @click="startEdit(category)"
              >
                <FontAwesomeIcon :icon="faPen" /></button
              ><button
                class="rounded p-1.5 text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
                title="削除"
                :disabled="locked"
                :aria-label="`${category.name}を削除`"
                @click="requestDelete(category.id, category.name)"
              >
                <FontAwesomeIcon :icon="faTrash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <MyConfirmDialog
      v-model:open="syncDialogOpen"
      title="参加回答から割当を更新しますか？"
      confirm-label="割当を更新"
      :loading="savingAction === 'sync'"
      @confirm="confirmSync"
      >対応する質問の現在の回答をもとに、すべての区分所属を上書きします。個別に変更した所属と金額もリセットされます。この操作は元に戻せません。</MyConfirmDialog
    >
    <MyConfirmDialog
      v-model:open="deleteDialogOpen"
      title="精算区分を削除しますか？"
      :message="
        deleteTarget
          ? `「${deleteTarget.name}」を削除します。所属などの関連データがある区分は削除できません。`
          : ''
      "
      confirm-label="削除"
      confirm-color="red"
      :loading="savingAction === 'delete'"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup lang="ts">
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, reactive, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import type {
  Finance,
  SettlementCategory,
  SettlementCategoryInput,
} from "./types";

const props = defineProps<{
  finance: Finance;
  savingAction: string | null;
  saveCategory: (
    input: SettlementCategoryInput,
    categoryId: string | null,
  ) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  syncMembers: () => Promise<boolean>;
}>();

const editing = ref(false);
const editingCategoryId = ref<string | null>(null);
const syncDialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const deleteTarget = ref<{ id: string; name: string } | null>(null);
const draft = reactive({
  name: "",
  baseParticipationFeeAmount: "0",
  commitmentQuestionId: "",
});
const locked = computed(() => props.finance.feeCalculationLockedAt !== null);
const validDraft = computed(
  () =>
    draft.name.trim() !== "" &&
    Number.isInteger(Number(draft.baseParticipationFeeAmount)) &&
    Number(draft.baseParticipationFeeAmount) >= 0,
);
const money = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
const questionLabel = (id: string | null) => {
  if (!id) return "関連付けなし";
  const question = props.finance.questions.find((item) => item.id === id);
  return question
    ? `${question.questionShort}${question.archived ? "（アーカイブ済み）" : ""}`
    : "削除された質問";
};

const startCreate = () => {
  editing.value = true;
  editingCategoryId.value = null;
  Object.assign(draft, {
    name: "",
    baseParticipationFeeAmount: "0",
    commitmentQuestionId: "",
  });
};
const startEdit = (category: SettlementCategory) => {
  editing.value = true;
  editingCategoryId.value = category.id;
  Object.assign(draft, {
    name: category.name,
    baseParticipationFeeAmount: String(category.baseParticipationFeeAmount),
    commitmentQuestionId: category.commitmentQuestionId ?? "",
  });
};
const cancelEdit = () => {
  editing.value = false;
  editingCategoryId.value = null;
};
const submitCategory = async () => {
  if (!validDraft.value) return;
  const saved = await props.saveCategory(
    {
      name: draft.name.trim(),
      baseParticipationFeeAmount: Number(draft.baseParticipationFeeAmount),
      commitmentQuestionId: draft.commitmentQuestionId || null,
    },
    editingCategoryId.value,
  );
  if (saved) cancelEdit();
};
const requestDelete = (id: string, name: string) => {
  deleteTarget.value = { id, name };
  deleteDialogOpen.value = true;
};
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  if (await props.deleteCategory(deleteTarget.value.id)) {
    deleteDialogOpen.value = false;
    deleteTarget.value = null;
  }
};
const confirmSync = async () => {
  if (await props.syncMembers()) syncDialogOpen.value = false;
};
</script>
