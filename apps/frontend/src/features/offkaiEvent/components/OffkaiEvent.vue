<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl ">オフ会の作成</h1>
    <MyFormField v-slot="{ id }" label="タイトル">
      <MyTextBox :id="id" :value="title.value" :on-change="title.set" :error="errors.title" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="開催開始日">
      <MyDatePicker :id="id" :value="eventStartDate.value" :on-change="eventStartDate.set"
        :error="errors.eventStartDate" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="開催終了日">
      <MyDatePicker :id="id" :value="eventEndDate.value" :on-change="eventEndDate.set"
        :error="errors.eventEndDate" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="募集開始日時">
      <MyDatePicker :id="id" type="date" :value="applicationStartDate.value" :on-change="applicationStartDate.set"
        :error="errors.applicationStartDate" :includes-time="true" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="説明">
      <MyTextarea :id="id" :value="description.value" :on-change="description.set" rows="12" />
    </MyFormField>

    <!-- 子フォーム -->
    <section>
      <h2 class="text-xl font-semibold mb-2">参加表明に関する質問</h2>
      <CommitmentQuestions :store="commitment" :errors="errors" />
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-2">アンケート</h2>
      <PreferenceQuestions :store="preference" :errors="errors" />
    </section>

    <MyButton class="w-full" color="primary" @click="submit">{{ isEdit ? 'オフ会を更新する' : 'オフ会を作成する' }}</MyButton>

  </main>
</template>

<script setup lang="ts">
  import { watch } from "vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyDatePicker from "@/common/components/MyDatePicker.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextarea from "@/common/components/MyTextarea.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import { OffkaiEventInitializeProps, useQuestionsForm } from "../composables"
  import CommitmentQuestions from "./CommitmentQuestions.vue"
  import PreferenceQuestions from "./PreferenceQuestions.vue"

  const { initialValue, handleSubmit, isEdit = false } = defineProps<{
    initialValue: OffkaiEventInitializeProps,
    handleSubmit: (payload: unknown) => void,
    isEdit?: boolean
  }>()

  const {
    title,
    eventStartDate,
    eventEndDate,
    applicationStartDate,
    description,
    commitment,
    preference,
    errors,
    initialize,
    toPayload,
    validate } = useQuestionsForm()


  watch(() => initialValue, () => {
    initialize(initialValue)
  })


  const submit = async () => {
    if (!validate()) return;
    await handleSubmit(toPayload())
  }
</script>
