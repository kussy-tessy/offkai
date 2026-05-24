<template>
  <div class="bg-slate-50 rounded-lg border border-gray-300 shadow p-4">
    <!-- 質問文 -->
    <MyFormField v-slot="{ id }" label="質問">
      <MyTextbox :id="id" type="text" :value="question.question" :on-change="v => onUpdate(question.id, { question: v })"
        :error="errorQuestion" />
    </MyFormField>

    <!-- 回答形式 -->
    <MyFormField v-slot="{ id }" label="回答形式">
      <select
        :id="id"
        class="w-full border border-gray-300 bg-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
        :value="question.answerTemplate.type" @change="onChangeType(($event.target as HTMLSelectElement).value)">
        <option value="free">自由記述</option>
        <option value="choices">選択肢</option>
        <option value="choicesIncludingOther">選択肢 + その他</option>
      </select>
    </MyFormField>

    <MyFormField v-slot="{ id }" label="回答必須">
      <MyCheckbox :id="id" :value="question.required" :on-change="required => onUpdate(question.id, { required })">
        この質問を必須にする
      </MyCheckbox>
    </MyFormField>

    <!-- 選択肢 -->
    <div v-if="hasChoices">
      <MyFormField label="選択肢">
        <div class="space-y-2">
          <div v-for="(choice, index) in question.answerTemplate.choices" :key="index" class="flex gap-2">
            <MyTextbox type="text" :value="choice" :on-change="v => updateChoice(index, v)" />
            <MyButton color="red" variant="ghost" size="sm" @click="removeChoice(index)">
              <FontAwesomeIcon :icon="faMinus" />
            </MyButton>
          </div>

          <MyButton size="sm" color="secondary" variant="ghost" @click="addChoice">
            <FontAwesomeIcon :icon="faPlus" />選択肢を追加
          </MyButton>
          <p v-if="errorChoices" class="text-sm text-red-600">{{ errorChoices }}</p>
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
  import { faMinus, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { computed } from "vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyCheckbox from "@/common/components/MyCheckbox.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextbox from "@/common/components/MyTextbox.vue"
  import type { PreferenceQuestion } from "../composables/usePreferenceQuestions"

  const props = defineProps<{
    question: PreferenceQuestion
    onUpdate: (id: string, patch: Partial<PreferenceQuestion>) => void
    onRemove: (id: string) => void
    errorQuestion?: string
    errorChoices?: string
  }>()

  const hasChoices = computed(() =>
    props.question.answerTemplate.type !== "free"
  )

  const onChangeType = (type: string) => {
    if (type === "free") {
      props.onUpdate(props.question.id, {
        answerTemplate: { type: "free" },
      })
      return
    }

    props.onUpdate(props.question.id, {
      answerTemplate: {
        type: type as "choices" | "choicesIncludingOther",
        choices: [],
      },
    })
  }

  const addChoice = () => {
    const choices = props.question.answerTemplate.choices ?? []
    props.onUpdate(props.question.id, {
      answerTemplate: {
        ...props.question.answerTemplate,
        choices: [...choices, ""],
      },
    })
  }

  const updateChoice = (index: number, value: string) => {
    const choices = props.question.answerTemplate.choices ?? []
    const next = choices.slice()
    next[index] = value

    props.onUpdate(props.question.id, {
      answerTemplate: {
        ...props.question.answerTemplate,
        choices: next,
      },
    })
  }

  const removeChoice = (index: number) => {
    const choices = props.question.answerTemplate.choices ?? []
    const next = choices.slice()
    next.splice(index, 1)

    props.onUpdate(props.question.id, {
      answerTemplate: {
        ...props.question.answerTemplate,
        choices: next,
      },
    })
  }
</script>
