<template>
  <div class="bg-slate-50 rounded-lg border border-gray-300 shadow p-4">
    <!-- 質問文 -->
    <MyFormField label="質問">
      <MyTextbox type="text" :value="question.question" :on-change="v => onUpdate(question.id, { question: v })" />
    </MyFormField>

    <!-- 回答形式 -->
    <MyFormField label="回答形式">
      <select
        class="w-full border border-gray-300 bg-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
        :value="question.answer.type" @change="onChangeType(($event.target as HTMLSelectElement).value)">
        <option value="free">自由記述</option>
        <option value="choices">選択肢</option>
        <option value="choicesIncludingOther">選択肢 + その他</option>
      </select>
    </MyFormField>

    <!-- 選択肢 -->
    <div v-if="hasChoices">
      <MyFormField label="選択肢">
        <div class="space-y-2">
          <div v-for="(choice, index) in question.answer.choices" :key="index" class="flex gap-2">
            <MyTextbox type="text" :value="choice" :on-change="v => updateChoice(index, v)" />
            <MyButton color="red" variant="ghost" size="sm" @click="removeChoice(index)">
              <FontAwesomeIcon :icon="faMinus" />
            </MyButton>
          </div>

          <MyButton size="sm" color="secondary" variant="ghost" @click="addChoice">
            <FontAwesomeIcon :icon="faPlus" />選択肢を追加
          </MyButton>
        </div>
      </MyFormField>
    </div>

    <!-- 削除 -->
    <div class="flex flex-col items-end">
      <MyButton color="red" size="sm" @click="onRemove(question.id)" variant="ghost">
        <FontAwesomeIcon :icon="faTrashCan" />
      </MyButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from "vue"
  import MyTextbox from "@/common/components/MyTextbox.vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import type { PreferenceQuestion } from "../composables/usePreferenceQuestions"
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faTrashCan, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

  const props = defineProps<{
    question: PreferenceQuestion
    onUpdate: (id: string, patch: Partial<PreferenceQuestion>) => void
    onRemove: (id: string) => void
  }>()

  const hasChoices = computed(() =>
    props.question.answer.type !== "free"
  )

  const onChangeType = (type: string) => {
    if (type === "free") {
      props.onUpdate(props.question.id, {
        answer: { type: "free" },
      })
      return
    }

    props.onUpdate(props.question.id, {
      answer: {
        type: type as "choices" | "choicesIncludingOther",
        choices: [],
      },
    })
  }

  const addChoice = () => {
    const choices = props.question.answer.choices ?? []
    props.onUpdate(props.question.id, {
      answer: {
        ...props.question.answer,
        choices: [...choices, ""],
      },
    })
  }

  const updateChoice = (index: number, value: string) => {
    const choices = props.question.answer.choices ?? []
    const next = choices.slice()
    next[index] = value

    props.onUpdate(props.question.id, {
      answer: {
        ...props.question.answer,
        choices: next,
      },
    })
  }

  const removeChoice = (index: number) => {
    const choices = props.question.answer.choices ?? []
    const next = choices.slice()
    next.splice(index, 1)

    props.onUpdate(props.question.id, {
      answer: {
        ...props.question.answer,
        choices: next,
      },
    })
  }
</script>