<template>
  <div class="flex flex-wrap gap-2">
    <MyButton
      v-if="can('feeCalculation', 'edit')"
      :disabled="!editable"
      @click="openEditor('categories')"
      type="button"
      size="sm"
    >
      区分を追加
    </MyButton>
  </div>
  <div class="table-wrap">
    <table
      aria-label="精算区分"
      class="category-table"
    >
      <thead>
        <tr>
          <th>区分名</th>
          <th class="text-right">基本参加費</th>
          <th class="text-right">人数</th>
          <th v-if="can('feeCalculation', 'edit')">
            <span class="sr-only">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="category in page.state.categories"
          :key="category.id"
        >
          <td>{{ category.name }}</td>
          <td class="text-right">
            <CategoryAmountInput
              v-if="category.questionId && can('feeCalculation', 'edit')"
              :category="category"
            />
            <span v-else>{{ amount(category.baseAmount) }}</span>
          </td>
          <td class="text-right whitespace-nowrap">
            {{ category.memberIds.length }}
          </td>
          <td
            v-if="can('feeCalculation', 'edit')"
            class="whitespace-nowrap"
          >
            <template
              v-if="!category.questionId && can('feeCalculation', 'edit')"
            >
              <MyButton
                class="!border-0 !p-1"
                title="区分を編集"
                aria-label="区分を編集"
                :disabled="!editable"
                @click="openEditor('categories', category)"
                type="button"
                size="sm"
                variant="ghost"
              >
                <FontAwesomeIcon :icon="faPen" />
              </MyButton>
              <MyButton
                v-if="!category.questionId"
                class="!border-0 !p-1"
                :title="
                  categoryInUse(category.id)
                    ? '徴収・追加請求・費目・経費・収入がある区分は削除できません'
                    : '区分を削除'
                "
                aria-label="区分を削除"
                :disabled="!editable || categoryInUse(category.id)"
                @click="remove('categories', category.id, category.name)"
                type="button"
                size="sm"
                variant="ghost"
                color="red"
              >
                <FontAwesomeIcon :icon="faTrash" />
              </MyButton>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="caption">
    金額の単位：円。＊は個別指定（基本金額の変更には追従しません）。
  </p>
  <div class="table-wrap charge-matrix">
    <table class="participant-table">
      <thead>
        <tr>
          <th class="person-column">参加者</th>
          <th>合計</th>
          <th
            v-for="category in page.state.categories"
            :key="category.id"
          >
            {{ category.name }}
          </th>
          <th>追加請求</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="person in page.state.people"
          :key="person.id"
        >
          <td class="person-column">
            <MyButton
              class="person-button text-teal-700"
              :disabled="busy"
              :aria-label="`${person.name}の請求を${can('feeCalculation', 'edit') && page.active ? '編集' : '確認'}`"
              @click="openParticipant(person.id)"
              type="button"
              size="sm"
              variant="ghost"
            >
              <span class="person-name" :title="person.name">{{ person.name }}</span>
              <FontAwesomeIcon
                v-if="can('feeCalculation', 'edit') && page.active"
                :icon="faPen"
                class="shrink-0"
              />
            </MyButton>
          </td>
          <td class="text-right font-semibold">
            {{ amount(personChargeTotal(person.id)) }}
          </td>
          <td
            v-for="category in page.state.categories"
            :key="category.id"
            class="text-right"
          >
            <template v-if="category.memberIds.includes(person.id)">
              <span
                :class="
                  isCustom(person.id, category.id)
                    ? 'text-red-700 font-semibold'
                    : ''
                "
                >{{ isCustom(person.id, category.id) ? "＊" : ""
                }}{{
                  amount(
                    basicCharge(person.id, category.id)?.amount ??
                      category.baseAmount,
                  )
                }}</span
              >
            </template>
            <template v-else
              ><span class="text-slate-400">—</span
              ><span
                v-if="basicCharge(person.id, category.id)?.received"
                class="block text-xs text-amber-800"
                >対象外・徴収済み</span
              ></template
            >
          </td>
          <td class="text-right">{{ amount(extraTotal(person.id)) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p
    v-if="!page.state.people.length"
    class="empty"
  >
    参加者の回答が届くと、この表に表示されます。
  </p>
</template>
<script setup lang="ts">
import MyButton from "@/common/components/MyButton.vue";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import CategoryAmountInput from "./CategoryAmountInput.vue";
import type { LedgerPage } from "@offkai/core";
import { useLedgerSession } from "../composables/useLedgerSession";
import type { LedgerPanelEvents } from "../types/ledger-panel-events";

const props = defineProps<{ page: LedgerPage }>();
const emit = defineEmits<LedgerPanelEvents & { participant: [id: string] }>();
const { busy, editable, can } = useLedgerSession();
const openEditor = (...args: LedgerPanelEvents["edit"]) =>
  emit("edit", ...args);
const remove = (...args: LedgerPanelEvents["remove"]) =>
  emit("remove", ...args);
const categoryInUse = (id: string) =>
  !!props.page &&
  [
    ...props.page.state.charges.filter(
      (c) =>
        !c.isBase ||
        !!props.page.calculation.charges.find((row) => row.id === c.id)
          ?.received,
    ),
    ...props.page.state.items,
    ...props.page.state.expenses,
    ...props.page.state.incomes,
  ].some((r) => r.categoryId === id);
const amount = (value: number) => value.toLocaleString("ja-JP");
const basicCharge = (personId: string, categoryId: string) =>
  props.page.calculation.charges.find(
    (c) => c.isBase && c.personId === personId && c.categoryId === categoryId,
  );
const isCustom = (personId: string, categoryId: string) => {
  const c = basicCharge(personId, categoryId);
  return !!c && !c.usesBaseAmount;
};
const extraTotal = (personId: string) =>
  props.page.calculation.charges
    .filter((c) => !c.isBase && c.personId === personId)
    .reduce((s, c) => s + c.amount, 0) ?? 0;
const personChargeTotal = (personId: string) =>
  props.page.calculation.charges
    .filter((c) => c.personId === personId)
    .reduce((s, c) => s + c.amount, 0) ?? 0;

const openParticipant = (id: string) => emit("participant", id);
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
<style scoped>
.category-table th,
.category-table td {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.charge-matrix td:not(.person-column),
.charge-matrix th:not(.person-column) {
  min-width: 4.5rem;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  white-space: nowrap;
}
</style>
