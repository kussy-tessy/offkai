<template>
  <div class="space-y-4 bg-slate-50 rounded-lg border border-gray-300 shadow p-4">
    <div class="flex flex-col gap-4 md:flex-row md:gap-1">
      <MyFormField v-slot="{ id }" label="質問" class="w-full md:w-[70%]">
        <MyTextbox :id="id" type="text" :value="question.question" placeholder="土曜日、宿に宿泊しますか？、日曜日、ロケに参加しますか？"
          :on-change="v => onUpdate(question.id, { question: v })" :error="errorQuestion" />
      </MyFormField>
      <MyFormField v-slot="{ id }" label="質問(見出し用)" class="w-full md:w-[30%]">
        <MyTextbox :id="id" type="text" :value="question.questionShort" placeholder="土泊、日ロケ"
          :on-change="v => onUpdate(question.id, { questionShort: v })" :error="errorQuestionShort" />
      </MyFormField>
    </div>
    <MyFormField v-slot="{ id }" label="説明">
      <MyTextarea :id="id" type="text" :value="question.description" placeholder="更衣室のキャパシティ判断に使用します。"
        :on-change="v => onUpdate(question.id, { description: v })" :error="errorDescription" />
    </MyFormField>
    <div class="flex flex-col gap-4 md:flex-row md:gap-1">
      <MyFormField v-slot="{ id }" label="締切" class="w-full md:w-[50%]">
        <MyDatePicker :id="id" type="date" :value="question.deadline" :on-change="v => onUpdate(question.id, { deadline: v })"
          :includes-time="true" :initial-time="{ hours: 23, minutes: 59 }" :error="errorDeadline" />
      </MyFormField>
      <MyFormField v-slot="{ id }" label="定員" class="w-full md:w-[50%]">
        <MyTextbox :id="id" type="text" inputmode="numeric" :value="question.capacity ?? ''" placeholder="定員"
          :normalize-input="normalizeCapacityInput" :error="errorCapacity" :on-change="v => {
            const trimmed = v.trim()
            if (trimmed === '') {
              onUpdate(question.id, { capacity: null })
              return
            }

            const n = Number(trimmed)
            onUpdate(question.id, { capacity: Number.isFinite(n) ? n : null })
          }" />
      </MyFormField>
    </div>
    <MyFormField v-slot="{ id }" label="必須設定">
      <MyCheckbox :id="id" :value="question.required" :on-change="required => onUpdate(question.id, { required })">
        この質問を必須にする
      </MyCheckbox>
    </MyFormField>
    <div class="flex items-center justify-between gap-2">
      <div class="flex gap-2" aria-label="質問の並び順">
        <MyButton color="gray" size="sm" variant="ghost" :disabled="!canMoveUp" aria-label="質問を上へ移動"
          @click="onMove(question.id, -1)">
          <FontAwesomeIcon :icon="faArrowUp" />
        </MyButton>
        <MyButton color="gray" size="sm" variant="ghost" :disabled="!canMoveDown" aria-label="質問を下へ移動"
          @click="onMove(question.id, 1)">
          <FontAwesomeIcon :icon="faArrowDown" />
        </MyButton>
      </div>
      <MyButton color="red" size="sm" @click="onRemove(question.id)" variant="ghost">
        <FontAwesomeIcon :icon="faTrashCan" />
      </MyButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { faArrowDown, faArrowUp, faTrashCan } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import MyButton from "@/common/components/MyButton.vue";
  import MyCheckbox from "@/common/components/MyCheckbox.vue";
  import MyDatePicker from "@/common/components/MyDatePicker.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyTextarea from "@/common/components/MyTextarea.vue";
  import MyTextbox from "@/common/components/MyTextbox.vue";
  import type { CommitmentQuestion } from "../composables"

  defineProps<{
    question: CommitmentQuestion
    onUpdate: (id: string, patch: Partial<CommitmentQuestion>) => void
    onRemove: (id: string) => void
    onMove: (id: string, offset: -1 | 1) => void
    canMoveUp: boolean
    canMoveDown: boolean
    errorQuestion?: string
    errorQuestionShort?: string
    errorDescription?: string
    errorDeadline?: string
    errorCapacity?: string
  }>()

  const normalizeCapacityInput = (value: string) => {
    const halfWidth = value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0),
    );

    return halfWidth.replace(/[^0-9]/g, "");
  }

</script>

<style scoped></style>
