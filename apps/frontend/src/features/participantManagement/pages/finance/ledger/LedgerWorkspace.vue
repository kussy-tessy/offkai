<template>
  <section class="space-y-4">
    <div
      v-if="loading && !page"
      class="p-5"
    >
      精算台帳を読み込み中…
    </div>
    <p
      v-if="error && !editor && !editingPerson && !receipt"
      role="alert"
      class="rounded bg-red-50 p-3 text-red-700"
    >
      {{ error }}
      <MyButton
        class="underline !border-0 !p-1"
        @click="load"
        type="button"
        size="sm"
        variant="ghost"
        >再読み込み</MyButton
      >
    </p>
    <template v-if="page">
      <div
        v-if="!page.active"
        class="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2"
      >
        <h2 class="font-bold">新しい精算方式のプレビュー</h2>
        <p class="text-sm">
          参加費と実費負担の差額で精算します。受け渡し記録を引き継ぎ、返金額は最新の収支から計算します。
        </p>
        <p class="text-sm">
          経費は登録額を支出として計上します。旧収入の受領状況は移行メモを確認してください。
        </p>
        <MyButton
          v-if="page.access.owner"
          :disabled="busy"
          @click="activateOpen = true"
          type="button"
          size="sm"
        >
          確認して新方式を使い始める
        </MyButton>
        <p
          v-else
          class="text-sm"
        >
          切替は主催者が行います。
        </p>
      </div>
      <div
        v-if="page.state.migrationNotes.length"
        class="rounded-lg border border-amber-200 p-3"
      >
        <details>
          <summary class="cursor-pointer font-semibold">
            移行時の確認事項（{{ page.state.migrationNotes.length }}件）
          </summary>
          <ul class="list-disc pl-5 text-sm space-y-1 mt-2">
            <li
              v-for="(message, i) in page.state.migrationNotes"
              :key="i"
            >
              {{ message }}
            </li>
          </ul>
        </details>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">{{ heading }}</h2>
          <p
            v-if="description"
            class="text-sm text-slate-600"
          >
            {{ description }}
          </p>
        </div>
        <MyButton
          class="shrink-0"
          :disabled="busy"
          @click="load"
          type="button"
          size="sm"
          variant="ghost"
          color="gray"
        >
          再読み込み
        </MyButton>
      </div>
      <KeepAlive>
        <LedgerCalculationPanel
          v-if="tab === 'calculation' && can('feeCalculation', 'read')"
          :page="page"
          @edit="openEditor"
          @remove="remove"
          @participant="openParticipant"
        />
        <LedgerSettlementPanel
          v-else-if="tab === 'settlement' && can('settlement', 'read')"
          :page="page"
          @edit="openEditor"
          @remove="remove"
          @payment="openSettlementPayment"
        />
        <LedgerCollectionPanel
          v-else-if="tab === 'collection' && can('feeCollection', 'read')"
          :page="page"
          @receive="openReceipt"
        />
        <LedgerTransferPanel
          v-else-if="
            tab === 'refund' &&
            (can('refund', 'read') || can('feeCollection', 'read'))
          "
          :page="page"
          :tab="tab"
          @payment="openRefund"
          @independent="(id) => openReceipt(id, 'collection', undefined, true)"
          @receive="(id) => openReceipt(id, 'recovery')"
        />
      </KeepAlive>
      <p
        v-if="!canReadTab"
        class="empty"
      >
        この画面を閲覧する権限がありません。上のメニューから担当の画面を選んでください。
      </p>
      <LedgerPaymentHistory
        v-if="tab !== 'calculation'"
        :page="page"
        :tab="tab"
        @edit="openEditor"
        @remove="remove"
      />
    </template>
    <ParticipantChargeEditor
      v-if="editingPerson && page"
      :key="editingPerson"
      :page="page"
      :person-id="editingPerson"
      :readonly="!page.active || !can('feeCalculation', 'edit')"
      :busy="busy"
      :error="error"
      @save="saveParticipant"
      @close="
        editingPerson = null;
        error = '';
      "
    />
    <CollectionReceiptEditor
      v-if="receipt && page"
      :key="receipt.key"
      :page="page"
      :person-id="receipt.personId"
      :kind="receipt.kind"
      :value="receipt.value"
      :independent-only="receipt.independentOnly"
      :busy="busy"
      :error="error"
      @close="
        receipt = null;
        error = '';
      "
      @save="saveReceipt"
    />
    <LedgerEditor
      v-if="editor && page"
      :key="editor.key"
      :page="page"
      :resource="editor.resource"
      :value="editor.value"
      :initial-person-id="editor.personId"
      :initial-category-id="editor.categoryId"
      :initial-reference-id="editor.referenceId"
      :initial-payment-kind="editor.paymentKind ?? defaultPaymentKind"
      :busy="busy || attachmentBusy"
      :error="error"
      @close="
        editor = null;
        error = '';
      "
      @save="saveEditor"
      @remove-adjustment="removeAdjustment"
    />
    <div
      v-if="activateOpen || deleteTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="操作の確認"
        class="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[85vh] overflow-auto space-y-4"
      >
        <template v-if="activateOpen">
          <h3 class="text-lg font-bold">新方式へ切り替えますか？</h3>
          <p>
            旧方式での編集は終了し、この台帳で徴収・精算・返金を続けます。返金済みの記録を残し、最新の計算額との差額を返金・追加徴収に反映します。
          </p>
          <p class="text-amber-800">
            旧収入の受領状況は、切替後に確認・入力してください。
          </p>
          <MyButton
            :disabled="busy"
            @click="activate"
            type="button"
            size="sm"
          >
            切り替える
          </MyButton>
        </template>
        <template v-else-if="deleteTarget">
          <h3 class="font-bold">{{ deleteTarget.label }}を削除しますか？</h3>
          <p>
            {{
              deleteTarget.resource === "categories"
                ? "区分と紐づく基本請求を削除します。変更履歴には残ります。徴収記録や追加請求・経費等がある区分は削除できません。"
                : deleteTarget.resource === "incomes"
                  ? "この収入と紐づく受領記録をまとめて削除します。資金残高と精算案にも反映されます。削除前の内容は変更履歴に残ります。"
                  : "誤って登録した記録を削除します。変更履歴には残ります。関連する入出金がある明細は先に関連記録を確認してください。"
            }}
          </p>
          <MyButton
            :disabled="busy"
            @click="confirmDelete"
            type="button"
            size="sm"
          >
            削除する
          </MyButton>
        </template>

        <p
          v-if="error"
          role="alert"
          class="text-red-700"
        >
          {{ error }}
        </p>
        <MyButton
          class="ml-2"
          :disabled="busy"
          @click="
            activateOpen = false;
            deleteTarget = null;
            error = '';
          "
          type="button"
          size="sm"
          variant="ghost"
          color="gray"
        >
          キャンセル
        </MyButton>
      </section>
    </div>
  </section>
</template>
<script setup lang="ts">
import type {
  LedgerPayment,
  LedgerResource,
  ParticipantChargesInput,
} from "@offkai/core";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import MyButton from "@/common/components/MyButton.vue";
import { getApiErrorMessage, useApi } from "@/common/composables";
import CollectionReceiptEditor from "./collection/CollectionReceiptEditor.vue";
import LedgerCalculationPanel from "./calculation/LedgerCalculationPanel.vue";
import LedgerCollectionPanel from "./collection/LedgerCollectionPanel.vue";
import LedgerEditor from "./shared/LedgerEditor.vue";
import LedgerPaymentHistory from "./history/LedgerPaymentHistory.vue";
import LedgerSettlementPanel from "./settlement/LedgerSettlementPanel.vue";
import LedgerTransferPanel from "./refund/LedgerTransferPanel.vue";
import { balanceText } from "./utils/ledger-display";
import ParticipantChargeEditor from "./calculation/ParticipantChargeEditor.vue";
import { provideLedgerSession } from "./composables/useLedgerSession";

const props = defineProps<{ eventId: string }>();
const { post } = useApi();
const attachmentBusy = ref(false);
const imageUploadIds = new WeakMap<File, string>();
const route = useRoute();
const {
  page,
  loading,
  busy,
  error,
  can,
  load,
  send,
  refreshExpenseImages,
  activate: activateLedger,
} = provideLedgerSession(() => props.eventId);
const tab = computed(() => route.path.split("/").pop() ?? "calculation");
const canReadTab = computed(
  () =>
    (tab.value === "refund" && can("feeCollection", "read")) ||
    (can(
      tab.value === "calculation"
        ? "feeCalculation"
        : tab.value === "collection"
          ? "feeCollection"
          : tab.value === "refund"
            ? "refund"
            : "settlement",
      "read",
    ) &&
      ["calculation", "collection", "refund", "settlement"].includes(
        tab.value,
      )),
);
const heading = computed(
  () =>
    ({
      calculation: "請求の設定",
      collection: "参加費の徴収",
      settlement: "収支の登録",
      refund: "返金・追加徴収",
    })[tab.value] ?? "精算台帳",
);
const description = computed(
  () =>
    ({
      calculation: "",
      collection: "",
      settlement: "別会計（帽子代など）を除く",
      refund: "",
    })[tab.value] ?? "",
);
const editingPerson = ref<string | null>(null);
function openParticipant(personId: string) {
  error.value = "";
  editingPerson.value = personId;
}
async function saveParticipant(input: ParticipantChargesInput) {
  if (await send({ action: "participantCharges", ...input }))
    editingPerson.value = null;
}
const editor = ref<{
  resource: LedgerResource;
  value?: unknown;
  personId?: string;
  categoryId?: string | null;
  referenceId?: string;
  paymentKind?: LedgerPayment["kind"];
  key: number;
} | null>(null);
function openEditor(
  resource: LedgerResource,
  value?: unknown,
  personId?: string,
  categoryId?: string | null,
) {
  error.value = "";
  if (resource === "payments" && tab.value === "collection" && value) {
    const payment = value as LedgerPayment;
    if (payment.kind === "collection" || payment.kind === "recovery") {
      const id =
        payment.kind === "recovery"
          ? payment.referenceId
          : page.value?.state.charges.find((c) => c.id === payment.referenceId)
              ?.personId;
      if (id) {
        openReceipt(id, payment.kind, payment);
        return;
      }
    }
  }
  editor.value = { resource, value, personId, categoryId, key: Date.now() };
}
const defaultPaymentKind = computed<LedgerPayment["kind"]>(() =>
  tab.value === "refund"
    ? "refund"
    : tab.value === "settlement"
      ? "expense"
      : "collection",
);
function openRefund(personId: string) {
  error.value = "";
  editor.value = {
    resource: "payments",
    paymentKind: "refund",
    referenceId: personId,
    key: Date.now(),
  };
}
function openSettlementPayment(
  paymentKind: "expense" | "income",
  referenceId: string,
) {
  error.value = "";
  editor.value = {
    resource: "payments",
    paymentKind,
    referenceId,
    key: Date.now(),
  };
}
const receipt = ref<{
  personId: string;
  kind: "collection" | "recovery";
  independentOnly?: boolean;
  value?: LedgerPayment;
  key: number;
} | null>(null);
function openReceipt(
  personId: string,
  kind: "collection" | "recovery",
  value?: LedgerPayment,
  independentOnly = false,
) {
  error.value = "";
  receipt.value = { personId, kind, value, independentOnly, key: Date.now() };
}
async function saveReceipt(value: LedgerPayment) {
  if (await send({ action: "put", resource: "payments", value }))
    receipt.value = null;
}
async function removeAdjustment(id: string) {
  if (editor.value?.resource !== "adjustments") return;
  if (await send({ action: "remove", resource: "adjustments", id })) {
    editor.value = null;
  }
}
async function saveEditor(
  value: unknown,
  payment?: LedgerPayment,
  receiptFiles: File[] = [],
) {
  if (
    editor.value &&
    !attachmentBusy.value &&
    (await send({
      action: "put",
      resource: editor.value.resource,
      value,
      payment,
    }))
  ) {
    if (editor.value.resource === "expenses" && receiptFiles.length) {
      attachmentBusy.value = true;
      const expenseId = (value as { id: string }).id;
      try {
        for (const file of receiptFiles) {
          let imageId = imageUploadIds.get(file);
          if (!imageId) {
            imageId = crypto.randomUUID();
            imageUploadIds.set(file, imageId);
          }
          await post(
            `/offkai-event/${props.eventId}/finance-ledger/expenses/${expenseId}/images/${imageId}`,
            file,
            {
              headers: { "Content-Type": "application/octet-stream" },
              timeout: 120_000,
            },
          );
        }
        refreshExpenseImages();
        await load();
      } catch (cause) {
        error.value = getApiErrorMessage(
          cause,
          "支出は保存されましたが、領収書画像のアップロードに失敗しました。もう一度保存すると再試行できます。",
        );
        return;
      } finally {
        attachmentBusy.value = false;
      }
    }
    editor.value = null;
  }
}
const deleteTarget = ref<{
  resource: LedgerResource;
  id: string;
  label: string;
} | null>(null);
function remove(resource: LedgerResource, id: string, label: string) {
  deleteTarget.value = { resource, id, label };
  error.value = "";
}
async function confirmDelete() {
  const target = deleteTarget.value;
  if (
    target &&
    (await send({ action: "remove", resource: target.resource, id: target.id }))
  )
    deleteTarget.value = null;
}
const activateOpen = ref(false);
async function activate() {
  if (await activateLedger()) activateOpen.value = false;
}
</script>
<style scoped src="./styles/ledger-workspace.css"></style>
