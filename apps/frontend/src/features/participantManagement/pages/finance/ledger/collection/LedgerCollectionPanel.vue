<template>
  <div class="flex flex-wrap items-center gap-3">
    <input
      v-model="search"
      class="rounded border p-2"
      placeholder="名前で絞り込み"
      aria-label="参加者名で絞り込み"
    />
    <MyCheckbox
      :value="onlyUnpaid"
      aria-label="未収がある人だけ表示"
      :on-change="(checked) => (onlyUnpaid = checked)"
    >
      未収がある人だけ
    </MyCheckbox>
  </div>
  <p class="caption">
    左端のチェックで参加費を一括徴収します。個別請求は請求ごとに徴収します。
  </p>
  <div class="table-wrap">
    <table aria-label="参加費の徴収">
      <thead>
        <tr>
          <th></th>
          <th>参加者</th>
          <th>参加費</th>
          <th>参加費未徴収額</th>
          <th v-if="can('feeCollection', 'record')">個別請求</th>
          <th v-if="can('feeCollection', 'record')">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="person in filteredPeople"
          :key="person.id"
        >
          <td>
            <MyCheckbox
              v-if="planned[person.id].hasCharges"
              :value="planned[person.id].complete"
              :disabled="
                !editable ||
                !can('feeCollection', 'record') ||
                !planned[person.id].eligible
              "
              :aria-label="`${person.name}の参加費の残り${yen(planned[person.id].amount)}を一括徴収`"
              :on-change="(checked) => checked && requestCollection(person.id)"
            />
          </td>
          <td class="whitespace-nowrap">
            {{ person.name }}
            <p
              v-if="
                planned[person.id].hasCharges &&
                !planned[person.id].eligible &&
                !planned[person.id].complete
              "
              class="caption max-w-64 whitespace-normal"
            >
              {{ planned[person.id].reason }}
            </p>
          </td>
          <td class="whitespace-nowrap">
            {{ yen(person.charged) }}
          </td>
          <td class="whitespace-nowrap">
            {{ yen(person.charged - person.received) }}
            <p
              v-if="person.charged - person.received < 0"
              class="text-xs text-amber-700"
            >
              過徴収
            </p>
          </td>
          <td
            v-if="can('feeCollection', 'record')"
            class="whitespace-nowrap"
          >
            <div
              v-if="independentCharges[person.id]?.length"
              class="grid gap-1"
            >
              <div
                v-for="charge in independentCharges[person.id]"
                :key="charge.id"
                class="flex items-center gap-2 whitespace-nowrap"
              >
                <MyCheckbox
                  :value="charge.remaining <= 0"
                  :disabled="
                    !editable ||
                    charge.remaining <= 0 ||
                    !can('feeCollection', 'record')
                  "
                  :aria-label="`${person.name}の${charge.title}の残り${yen(charge.remaining)}を徴収`"
                  :on-change="
                    (checked) => checked && collectIndependent(charge)
                  "
                />
                <span>{{ charge.title }}</span>
                <span
                  v-if="charge.remaining > 0"
                  class="text-sm"
                  >{{ yen(charge.remaining) }}</span
                >
                <span
                  v-else-if="charge.remaining < 0"
                  class="text-xs text-amber-700"
                  >過徴収 {{ yen(-charge.remaining) }}</span
                >
                <span
                  v-else
                  class="text-xs text-slate-500"
                  >{{ yen(charge.amount) }}</span
                >
              </div>
            </div>
            <span v-else>—</span>
          </td>
          <td v-if="can('feeCollection', 'record')">
            <MyButton
              v-if="canSpecify(person.id)"
              type="button"
              size="sm"
              variant="ghost"
              :disabled="!editable"
              :aria-label="`${person.name}の部分徴収`"
              @click="emit('receive', person.id, 'collection')"
              >部分徴収</MyButton
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p
    v-if="!filteredPeople.length"
    class="empty"
  >
    該当する参加者はいません。
  </p>
  <p
    v-if="notice"
    role="status"
    class="rounded bg-teal-50 p-3 text-teal-900"
  >
    {{ notice }}
  </p>
  <MyConfirmDialog
    v-model:open="collectionDialogOpen"
    horizontal-actions
    title="参加費の一括徴収"
    :confirm-label="dialogIndependentCharges.length ? 'はい' : '徴収する'"
    :cancel-label="dialogIndependentCharges.length ? 'いいえ' : 'キャンセル'"
    :cancel-closes="!dialogIndependentCharges.length"
    :message="collectionDialogMessage"
    :loading="busy"
    @confirm="confirmCollection"
    @cancel="chooseFeeOnly"
  />
</template>
<script setup lang="ts">
import { getPlannedCollection, type LedgerPage } from "@offkai/core";
import { computed, ref } from "vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import MyButton from "@/common/components/MyButton.vue";
import MyCheckbox from "@/common/components/MyCheckbox.vue";
import { yen } from "../utils/ledger-display";
import { useLedgerSession } from "../composables/useLedgerSession";

const props = defineProps<{ page: LedgerPage }>();
const emit = defineEmits<{
  receive: [personId: string, kind: "collection" | "recovery"];
}>();
const { editable, busy, can, send } = useLedgerSession();
const search = ref("");
const onlyUnpaid = ref(false);
const notice = ref("");
const confirmingPersonId = ref<string | null>(null);
const includeIndependent = ref(false);
const collectionDialogOpen = computed({
  get: () => confirmingPersonId.value !== null,
  set: (open: boolean) => {
    if (!open) confirmingPersonId.value = null;
  },
});
const planned = computed(() =>
  Object.fromEntries(
    props.page.state.people.map((p) => {
      const collection = getPlannedCollection(props.page.state, p.id);
      return [
        p.id,
        {
          ...collection,
        },
      ];
    }),
  ),
);
const independentCharges = computed(() =>
  Object.fromEntries(
    props.page.calculation.charges
      .filter((charge) => charge.categoryId === null)
      .reduce((byPerson, charge) => {
        const rows = byPerson.get(charge.personId) ?? [];
        rows.push(charge);
        byPerson.set(charge.personId, rows);
        return byPerson;
      }, new Map<string, typeof props.page.calculation.charges>()),
  ),
);
const dialogIndependentCharges = computed(() =>
  (independentCharges.value[confirmingPersonId.value ?? ""] ?? []).filter(
    (charge) => charge.remaining > 0,
  ),
);
const dialogPersonName = computed(
  () =>
    props.page.state.people.find(
      (person) => person.id === confirmingPersonId.value,
    )?.name ?? "参加者",
);
const collectionDialogMessage = computed(() => {
  const amount = confirmingPersonId.value
    ? (planned.value[confirmingPersonId.value]?.amount ?? 0)
    : 0;
  const message = `${dialogPersonName.value}の参加費${yen(amount)}を一括徴収します。`;
  if (!dialogIndependentCharges.value.length) return message;
  const charges = dialogIndependentCharges.value
    .map((charge) => `${charge.title}（${yen(charge.remaining)}）`)
    .join("、");
  return `${message}\n個別請求の${charges}もまとめて徴収しますか？`;
});
function canSpecify(personId: string) {
  return (
    planned.value[personId].outstanding.length > 0 ||
    (independentCharges.value[personId] ?? []).some(
      (charge) => charge.remaining > 0,
    )
  );
}
const matchingPeople = computed(() =>
  props.page.calculation.participants.filter((p) =>
    p.name.includes(search.value.trim()),
  ),
);
const filteredPeople = computed(() =>
  matchingPeople.value.filter((p) => !onlyUnpaid.value || canSpecify(p.id)),
);
function requestCollection(personId: string) {
  confirmingPersonId.value = personId;
  includeIndependent.value = false;
}
function cancelCollection() {
  confirmingPersonId.value = null;
  includeIndependent.value = false;
}
function chooseFeeOnly() {
  if (!dialogIndependentCharges.value.length) {
    cancelCollection();
    return;
  }
  includeIndependent.value = false;
  void confirmCollection();
}
async function confirmCollection() {
  const personId = confirmingPersonId.value;
  if (!personId) return;
  const amount = planned.value[personId].amount;
  const additional = includeIndependent.value
    ? dialogIndependentCharges.value.map((charge) => ({
        title: charge.title,
        amount: charge.remaining,
      }))
    : [];
  const name =
    props.page.state.people.find((p) => p.id === personId)?.name ?? personId;
  notice.value = "";
  if (
    await send({
      action: "collectPlanned",
      personId,
      includeIndependent: includeIndependent.value,
    })
  ) {
    notice.value = additional.length
      ? `${name}の参加費${yen(amount)}と個別請求（${additional.map((charge) => `${charge.title} ${yen(charge.amount)}`).join("、")}）を徴収しました。`
      : `${name}の参加費${yen(amount)}を徴収しました。`;
    confirmingPersonId.value = null;
    includeIndependent.value = false;
  }
}
async function collectIndependent(
  charge: (typeof props.page.calculation.charges)[number],
) {
  if (!charge || charge.remaining <= 0) return;
  const name =
    props.page.state.people.find((person) => person.id === charge.personId)
      ?.name ?? charge.personId;
  notice.value = "";
  if (
    await send({
      action: "put",
      resource: "payments",
      value: {
        id: crypto.randomUUID(),
        kind: "collection",
        referenceId: charge.id,
        amount: charge.remaining,
        at: new Date().toISOString(),
        note: "",
        migrated: false,
      },
    })
  )
    notice.value = `${name}の「${charge.title}」${yen(charge.remaining)}を徴収しました。`;
}
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
