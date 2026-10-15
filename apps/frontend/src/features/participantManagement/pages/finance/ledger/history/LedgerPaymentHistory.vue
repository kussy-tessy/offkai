<template>
  <details
    v-if="tab !== 'calculation'"
    class="card"
    :open="tab !== 'collection'"
  >
    <summary class="font-bold cursor-pointer">
      {{
        tab === "collection"
          ? "徴収履歴"
          : tab === "settlement"
            ? "経費・収入の受け渡し履歴"
            : "受け渡し履歴"
      }}（{{ visiblePayments.length }}件）
    </summary>
    <div class="table-wrap mt-3">
      <table>
        <thead>
          <tr>
            <th>日時</th>
            <th>種類・対象</th>
            <th>金額</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="payment in visiblePayments"
            :key="payment.id"
          >
            <td>
              {{ new Date(payment.at).toLocaleString()
              }}<span
                v-if="payment.migrated"
                class="caption block"
                >旧記録から移行</span
              >
            </td>
            <td>
              {{ paymentLabel(payment.kind) }}／{{ referenceName(payment) }}
              <p class="caption">{{ payment.note }}</p>
            </td>
            <td>{{ yen(payment.amount) }}</td>
            <td v-if="canEditPayment(payment)">
              <MyButton
                class="!border-0 !p-1"
                :disabled="!editable"
                @click="openEditor('payments', payment)"
                type="button"
                size="sm"
                variant="ghost"
              >
                訂正
              </MyButton>
              <MyButton
                title="削除"
                aria-label="削除"
                class="!border-0 !p-1"
                :disabled="!editable"
                @click="remove('payments', payment.id, '受け渡し記録')"
                type="button"
                size="sm"
                variant="ghost"
                color="red"
              >
                <FontAwesomeIcon :icon="faTrash" />
              </MyButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</template>
<script setup lang="ts">
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import type { LedgerPage, LedgerPayment } from "@offkai/core";
import { computed } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import { paymentLabel, yen } from "../utils/ledger-display";
import type { LedgerPanelEvents } from "../types/ledger-panel-events";
import { useLedgerSession } from "../composables/useLedgerSession";

const props = defineProps<{ page: LedgerPage; tab: string }>();
const emit = defineEmits<LedgerPanelEvents>();
const { editable, can } = useLedgerSession();
const openEditor = (...args: LedgerPanelEvents["edit"]) =>
  emit("edit", ...args);
const remove = (...args: LedgerPanelEvents["remove"]) =>
  emit("remove", ...args);
const tab = computed(() => props.tab);
const name = (id: string) =>
  props.page.state.people.find((p) => p.id === id)?.name ?? id;
const paymentArea = (kind: string) =>
  ["collection", "recovery"].includes(kind)
    ? "feeCollection"
    : kind === "refund"
      ? "refund"
      : "settlement";
function canEditPayment(payment: LedgerPayment) {
  const area = paymentArea(payment.kind);
  return can(area, area === "settlement" ? "edit" : "record");
}
const visiblePayments = computed(() =>
  [...(props.page.state.payments ?? [])]
    .filter((p) => p.kind !== "expense")
    .filter(
      (p) =>
        (tab.value === "refund" &&
          (p.kind === "recovery" ||
            (p.kind === "collection" &&
              props.page.state.charges.some(
                (c) => c.id === p.referenceId && c.categoryId === null,
              )))) ||
        paymentArea(p.kind) ===
          (tab.value === "collection"
            ? "feeCollection"
            : tab.value === "refund"
              ? "refund"
              : "settlement"),
    )
    .sort((a, b) => b.at.localeCompare(a.at)),
);
function referenceName(p: LedgerPayment) {
  const s = props.page.state;
  if (p.kind === "refund" || p.kind === "recovery") return name(p.referenceId);
  if (p.kind === "collection") {
    const c = s.charges.find((c) => c.id === p.referenceId);
    return c ? `${name(c.personId)}／${c.title}` : p.referenceId;
  }
  return (
    [...s.expenses, ...s.incomes].find((r) => r.id === p.referenceId)?.title ??
    p.referenceId
  );
}
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
