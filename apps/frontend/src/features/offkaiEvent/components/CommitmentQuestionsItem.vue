<template>
  <div class="bg-slate-50 rounded-lg border border-gray-300 shadow p-4">
    <div class="flex flex-col md:flex-row gap-1">
      <MyFormField label="質問" class="w-full md:w-[70%]">
        <MyTextbox type="text" :value="question.question" placeholder="土曜日、宿に宿泊しますか？、日曜日、ロケに参加しますか？"
          :on-change="v => onUpdate(question.id, { question: v })" />
      </MyFormField>
      <MyFormField label="質問(見出し用)" class="w-full md:w-[30%]">
        <MyTextbox type="text" :value="question.questionShort" placeholder="土泊、日ロケ"
          :on-change="v => onUpdate(question.id, { questionShort: v })" />
      </MyFormField>
    </div>
    <MyFormField label="説明">
      <MyTextarea type="text" :value="question.description" placeholder="更衣室のキャパシティ判断に使用します。"
        :on-change="v => onUpdate(question.id, { description: v })" />
    </MyFormField>
    <div class="flex flex-col md:flex-row gap-1">
      <MyFormField label="締切" class="w-full md:w-[50%]">
        <MyDatePicker type="date" :value="question.deadline" :on-change="v => onUpdate(question.id, { deadline: v })"
          :includes-time="true" />
      </MyFormField>
      <MyFormField label="定員" class="w-full md:w-[50%]">
        <MyTextbox type="text" inputmode="numeric" :value="question.capacity ?? ''" placeholder="定員" :on-change="v => {
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
    <div class="flex flex-col items-end">
      <MyButton color="red" size="sm" @click="onRemove(question.id)" variant="ghost">
        <FontAwesomeIcon :icon="faTrashCan" />
      </MyButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import MyTextbox from "@/common/components/MyTextbox.vue";
  import type { CommitmentQuestion } from "../composables"
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyTextarea from "@/common/components/MyTextarea.vue";
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
  import MyDatePicker from "@/common/components/MyDatePicker.vue";
  defineProps<{
    question: CommitmentQuestion
    onUpdate: (id: string, patch: Partial<CommitmentQuestion>) => void
    onRemove: (id: string) => void
  }>()

</script>

<style scoped></style>
