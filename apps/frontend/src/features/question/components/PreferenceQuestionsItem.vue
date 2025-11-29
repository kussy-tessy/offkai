<template>
  <div class="">
    <MyFormField label="質問">
      <MyTextbox type="text" :value="question.question"
        :on-change="v => onUpdate(question.id, { question: v })" />
    </MyFormField>
    <MyFormField label="説明">
      <MyTextarea type="text" :value="question.question"
        :on-change="v => onUpdate(question.id, { question: v })" />
    </MyFormField>
    <MyButton color="red" @click="onRemove(question.id)">削除</MyButton>
  </div>
</template>

<script setup lang="ts">
  import MyTextbox from "@/common/components/MyTextbox.vue";
  import MyTextarea from "@/common/components/MyTextarea.vue";
  import type { CommitmentQuestion } from "../composables"
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";

  defineProps<{
    question: CommitmentQuestion
    onUpdate: (id: string, patch: Partial<CommitmentQuestion>) => void
    onRemove: (id: string) => void
  }>()
</script>

<style scoped></style>
