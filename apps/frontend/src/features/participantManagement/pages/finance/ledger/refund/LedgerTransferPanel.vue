<template>
  <div class="flex flex-wrap items-center gap-3">
    <input
      v-model="search"
      class="rounded border p-2"
      placeholder="名前で絞り込み"
      aria-label="参加者名で絞り込み"
    />
    <MyCheckbox
      :value="onlyPending"
      aria-label="未返金・未追加徴収のある人のみ表示"
      :on-change="(checked) => (onlyPending = checked)"
    >
      未返金・未追加徴収のある人のみ
    </MyCheckbox>
  </div>
  <p class="caption">
    イベントの差額と別会計の未徴収を表示します。返金と別会計の集金はそれぞれ記録してください。
  </p>
  <div class="table-wrap">
    <table class="participant-table has-selection numeric-columns" aria-label="返金・追加徴収">
      <thead>
        <tr>
          <th class="selection-column"><span class="sr-only">返金</span></th>
          <th class="person-column">参加者</th>
          <th>今の返金／追加徴収</th>
          <th>別会計</th>
          <th v-if="can('refund', 'read')">返金済み</th>
          <th v-if="can('feeCollection', 'read')">追加徴収済み</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in people"
          :key="p.id"
        >
          <td class="selection-column">
            <MyCheckbox
              :key="`${page.revision}:${editable}`"
              :value="
                p.remaining === 0 &&
                !p.independentUncollected &&
                !p.independentOvercollected
              "
              :disabled="
                !editable ||
                !can('refund', 'record') ||
                !getPlannedRefund(p.remaining).eligible
              "
              :aria-label="`${p.name}の返金残額を一括記録`"
              :on-change="(checked) => checked && refund(p.id)"
            />
          </td>
          <td class="person-column">
            <span class="person-name" :title="p.name">{{ p.name }}</span>
          </td>
          <td
            class="whitespace-nowrap font-semibold"
            :class="
              p.remaining !== null && p.remaining < 0 ? 'text-amber-800' : ''
            "
          >
            {{
              p.remaining === null
                ? "未配分あり"
                : p.remaining === 0 &&
                    (p.independentUncollected || p.independentOvercollected)
                  ? "イベント分は精算済み"
                  : balanceText(p.remaining)
            }}
          </td>
          <td class="whitespace-nowrap">
            <div
              v-if="p.independentUncollected"
              class="flex items-center justify-end gap-1 whitespace-nowrap"
            >
              <span class="font-semibold text-amber-800">
                未徴収 {{ yen(p.independentUncollected) }}
              </span>
              <MyButton
                v-if="can('feeCollection', 'record')"
                size="sm"
                variant="ghost"
                :disabled="!editable"
                class="!border-0 !p-1"
                title="別会計を集金"
                :aria-label="`${p.name}の別会計を集金`"
                @click="emit('independent', p.id)"
              >
                <FontAwesomeIcon :icon="faCoins" />
              </MyButton>
              <span
                v-else
                class="caption"
                >徴収担当に確認してください</span
              >
            </div>
            <p
              v-if="p.independentOvercollected"
              class="text-amber-800"
            >
              過徴収 {{ yen(p.independentOvercollected) }}・記録を確認
            </p>
            <span
              v-if="!p.independentUncollected && !p.independentOvercollected"
              >—</span
            >
          </td>
          <td v-if="can('refund', 'read')">{{ yen(p.refunded) }}</td>
          <td v-if="can('feeCollection', 'read')">{{ yen(p.recovered) }}</td>
          <td class="whitespace-nowrap">
            <div class="flex flex-nowrap items-center justify-end gap-1">
              <MyButton
                v-if="
                  p.remaining !== null &&
                  p.remaining < 0 &&
                  can('feeCollection', 'record')
                "
                size="sm"
                variant="ghost"
                color="red"
                :disabled="!editable"
                :aria-label="`${p.name}の追加徴収`"
                @click="emit('receive', p.id)"
                >追加徴収</MyButton
              >
              <MyButton
                v-if="
                  p.remaining !== null &&
                  p.remaining > 0 &&
                  can('refund', 'record')
                "
                size="sm"
                variant="ghost"
                :disabled="!editable"
                :aria-label="`${p.name}の部分返金`"
                @click="emit('payment', p.id)"
                >部分返金</MyButton
              >
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p
    v-if="notice"
    role="status"
    class="rounded bg-teal-50 p-3 text-teal-900"
  >
    {{ notice }}
  </p>
</template>
<script setup lang="ts">
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { getPlannedRefund, type LedgerPage } from "@offkai/core";
import { computed, ref } from "vue";
import MyButton from "@/common/components/MyButton.vue";
import MyCheckbox from "@/common/components/MyCheckbox.vue";
import { balanceText, yen } from "../utils/ledger-display";
import { useLedgerSession } from "../composables/useLedgerSession";
const props = defineProps<{ page: LedgerPage; tab?: string }>();
const emit = defineEmits<{
  receive: [id: string];
  independent: [id: string];
  payment: [id: string];
}>();
const { can, editable, send } = useLedgerSession();
const search = ref("");
const onlyPending = ref(false);
const notice = ref("");
const people = computed(() =>
  props.page.calculation.participants.filter(
    (p) =>
      p.name.includes(search.value.trim()) &&
      (!onlyPending.value ||
        p.remaining !== 0 ||
        p.independentUncollected > 0 ||
        p.independentOvercollected > 0),
  ),
);
async function refund(personId: string) {
  if (await send({ action: "refundPlanned", personId }))
    notice.value = "返金を記録しました。";
}
</script>
<style scoped src="../styles/ledger-workspace.css"></style>
