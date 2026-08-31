<template>
  <section
    class="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <div>
      <h2 class="text-xl font-semibold text-slate-900">スタッフに認める権限</h2>
      <p class="mt-1 text-sm text-slate-600">
        原則として、スタッフ本人が参加表明しているオフ会にのみ適用されます。
      </p>
    </div>

    <div v-if="loading" class="py-6 text-center text-sm text-slate-400">
      読み込み中…
    </div>
    <template v-else>
      <PermissionSection title="参加前の権限">
        <MyCheckbox
          :value="permissions.showUnansweredEvents"
          :on-change="(v) => (permissions.showUnansweredEvents = v)"
        >
          参加表明していないオフ会もダッシュボードに表示する
        </MyCheckbox>
        <MyCheckbox
          :value="permissions.allowApplicationBeforeStart"
          :on-change="(v) => (permissions.allowApplicationBeforeStart = v)"
        >
          募集開始日時より前でも参加表明できる
        </MyCheckbox>
      </PermissionSection>

      <PermissionSection title="オフ会の管理">
        <MyCheckbox
          :value="permissions.eventManagement"
          :on-change="(v) => (permissions.eventManagement = v)"
        >
          オフ会の内容を編集できる
        </MyCheckbox>
        <p class="text-xs text-slate-500">
          アンケート、締切、定員、募集開始日時、概要、公開範囲、参加者向け案内などを変更できます。オフ会の作成・削除はOwnerのみ可能です。
        </p>
      </PermissionSection>

      <PermissionSection title="参加者管理">
        <PermissionChoices
          v-model="permissions.answerManagement"
          label="ほかの参加者の回答"
          :options="answerOptions"
        />
      </PermissionSection>

      <PermissionSection title="Discordロール">
        <PermissionChoices
          v-model="permissions.discordRole"
          label="Discordロール"
          :options="discordOptions"
        />
      </PermissionSection>

      <PermissionSection title="お金の管理">
        <PermissionChoices
          v-model="permissions.feeCalculation"
          label="参加費計算"
          :options="feeCalculationOptions"
        />
        <PermissionChoices
          v-model="permissions.feeCollection"
          label="参加費徴収"
          :options="feeCollectionOptions"
        />
        <PermissionChoices
          v-model="permissions.settlement"
          label="経費精算"
          :options="settlementOptions"
        />
        <PermissionChoices
          v-model="permissions.refund"
          label="返金"
          :options="refundOptions"
        />
      </PermissionSection>

      <div
        class="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between"
        :class="
          isDirty ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
        "
      >
        <p
          class="text-sm font-medium"
          :class="isDirty ? 'text-amber-900' : 'text-slate-500'"
        >
          {{ isDirty ? "未保存の変更があります。" : "変更はありません。" }}
        </p>
        <MyButton
          class="w-full sm:w-auto"
          :loading="saving"
          :disabled="saving || !isDirty"
          @click="save"
        >
          変更を保存する
        </MyButton>
      </div>
    </template>

    <MyConfirmDialog
      v-model:open="leaveConfirmOpen"
      title="未保存の変更を破棄しますか？"
      message="スタッフ権限への変更がまだ保存されていません。移動すると変更内容は失われます。"
      confirm-label="変更を破棄して移動"
      cancel-label="編集を続ける"
      confirm-color="red"
      @confirm="confirmLeave"
      @cancel="cancelLeave"
    />
  </section>
</template>

<script setup lang="ts">
import type { StaffPermissions } from "@offkai/core";
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  type PropType,
} from "vue";
import { onBeforeRouteLeave } from "vue-router";
import MyButton from "@/common/components/MyButton.vue";
import MyCheckbox from "@/common/components/MyCheckbox.vue";
import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

type Option = { value: string; label: string; description: string };

const PermissionSection = defineComponent({
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    return () =>
      h("section", { class: "space-y-3 border-t border-slate-200 pt-5" }, [
        h("h3", { class: "font-semibold text-slate-800" }, props.title),
        h("div", { class: "space-y-3" }, slots.default?.()),
      ]);
  },
});

const PermissionChoices = defineComponent({
  props: {
    modelValue: { type: String, required: true },
    label: { type: String, required: true },
    options: { type: Array as PropType<Option[]>, required: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("fieldset", { class: "space-y-2 rounded-lg bg-slate-50 p-3" }, [
        h("legend", { class: "px-1 font-medium text-slate-800" }, props.label),
        ...props.options.map((option) =>
          h(
            "label",
            {
              class:
                "flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-white",
            },
            [
              h("input", {
                type: "radio",
                name: props.label,
                value: option.value,
                checked: props.modelValue === option.value,
                class: "mt-1 accent-teal-600",
                onChange: () => emit("update:modelValue", option.value),
              }),
              h("span", [
                h(
                  "span",
                  { class: "block text-sm font-medium text-slate-800" },
                  option.label,
                ),
                h(
                  "span",
                  { class: "block text-xs text-slate-500" },
                  option.description,
                ),
              ]),
            ],
          ),
        ),
      ]);
  },
});

const { get, put } = useApi();
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const defaultPermissions: StaffPermissions = {
  showUnansweredEvents: true,
  allowApplicationBeforeStart: false,
  eventManagement: false,
  answerManagement: "read",
  discordRole: "manage",
  feeCalculation: "confirm",
  feeCollection: "record",
  settlement: "confirm",
  refund: "record",
};
const permissions = ref<StaffPermissions>({ ...defaultPermissions });
const savedPermissions = ref<StaffPermissions>({ ...defaultPermissions });
const leaveConfirmOpen = ref(false);
let resolveLeave: ((allow: boolean) => void) | null = null;
const isDirty = computed(
  () =>
    JSON.stringify(permissions.value) !==
    JSON.stringify(savedPermissions.value),
);

const answerOptions: Option[] = [
  {
    value: "read",
    label: "閲覧のみ",
    description: "参加者全員の基本権限です。",
  },
  {
    value: "edit",
    label: "回答を編集できる",
    description: "通常参加者の回答編集と、ゲストの追加・編集ができます。",
  },
  {
    value: "delete",
    label: "回答を編集・削除できる",
    description: "上記に加えて、通常参加者とゲストの回答を削除できます。",
  },
];
const discordOptions: Option[] = [
  {
    value: "none",
    label: "関与しない",
    description: "Discordロールの管理画面を利用できません。",
  },
  {
    value: "read",
    label: "付与状況を確認する",
    description: "使用中のロールと参加者への付与状況を閲覧できます。",
  },
  {
    value: "assign",
    label: "参加者への付与・解除を行う",
    description: "参加者のDiscordロールを付与・解除できます。",
  },
  {
    value: "manage",
    label: "ロール設定も変更する",
    description: "このオフ会で使用するDiscordロールも変更できます。",
  },
];
const feeCalculationOptions: Option[] = [
  {
    value: "none",
    label: "関与しない",
    description: "参加費計算画面を利用できません。",
  },
  {
    value: "read",
    label: "内容を確認する",
    description: "精算区分と参加者ごとの請求額・内訳を閲覧できます。",
  },
  {
    value: "edit",
    label: "計算内容を編集する",
    description: "精算区分、対象者、個別金額、追加請求、備考を編集できます。",
  },
  {
    value: "confirm",
    label: "計算内容を編集・確定する",
    description: "上記に加えて、参加費の確定・確定解除ができます。",
  },
];
const feeCollectionOptions: Option[] = [
  {
    value: "none",
    label: "関与しない",
    description: "参加費徴収画面を利用できません。",
  },
  {
    value: "read",
    label: "徴収状況を確認する",
    description: "請求額・内訳と徴収状況を閲覧できます。",
  },
  {
    value: "record",
    label: "徴収状況を記録する",
    description: "徴収済み・未徴収を更新できます。",
  },
];
const settlementOptions: Option[] = [
  {
    value: "none",
    label: "関与しない",
    description: "経費精算画面を利用できません。",
  },
  {
    value: "read",
    label: "内容を確認する",
    description: "経費、収入、返金見込み、切り捨て単位を閲覧できます。",
  },
  {
    value: "edit",
    label: "経費・収入を編集する",
    description: "経費と収入を追加・編集・削除できます。",
  },
  {
    value: "confirm",
    label: "経費・収入を編集し、精算を確定する",
    description: "切り捨て単位の変更と、経費精算の確定・確定解除ができます。",
  },
];
const refundOptions: Option[] = [
  {
    value: "none",
    label: "関与しない",
    description: "返金画面を利用できません。",
  },
  {
    value: "read",
    label: "返金内容を確認する",
    description: "参加者ごとの返金額・内訳と返金状況を閲覧できます。",
  },
  {
    value: "record",
    label: "返金を記録する",
    description: "返金済み・未返金を更新できます。",
  },
];

onMounted(async () => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  try {
    const result = await get<StaffPermissions>("/series/my/staff-permissions");
    if (result) {
      permissions.value = { ...result };
      savedPermissions.value = { ...result };
    }
  } catch (cause) {
    toast.error(
      getApiErrorMessage(cause, "スタッフ権限を読み込めませんでした。"),
    );
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  resolvePendingLeave(false);
});

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true;
  leaveConfirmOpen.value = true;
  return new Promise<boolean>((resolve) => {
    resolvePendingLeave(false);
    resolveLeave = resolve;
  });
});

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

function resolvePendingLeave(allow: boolean) {
  resolveLeave?.(allow);
  resolveLeave = null;
}

function confirmLeave() {
  leaveConfirmOpen.value = false;
  resolvePendingLeave(true);
}

function cancelLeave() {
  resolvePendingLeave(false);
}

const save = async () => {
  if (!isDirty.value) return;
  const payload = { ...permissions.value };
  saving.value = true;
  try {
    const result = await put<StaffPermissions>(
      "/series/my/staff-permissions",
      payload,
    );
    if (result) {
      savedPermissions.value = { ...result };
      if (JSON.stringify(permissions.value) === JSON.stringify(payload)) {
        permissions.value = { ...result };
      }
    }
    toast.success("スタッフ権限を保存しました。");
  } catch (cause) {
    toast.error(
      getApiErrorMessage(cause, "スタッフ権限を保存できませんでした。"),
    );
  } finally {
    saving.value = false;
  }
};
</script>
