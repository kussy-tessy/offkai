<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl ">オフ会の作成</h1>
    <MyFormField label="タイトル">
      <MyTextBox :value="title.value" :on-change="title.set" :error="errors.title" />
    </MyFormField>

    <MyFormField label="開催日">
      <MyDatePicker :value="eventDate.value" :on-change="eventDate.set" :error="errors.eventDate" />
    </MyFormField>

    <MyFormField label="募集開始日時">
      <MyDatePicker type="date" :value="applicationStartDate.value" :on-change="applicationStartDate.set"
        :error="errors.applicationStartDate" :includes-time="true" />
    </MyFormField>

    <MyFormField label="説明">
      <MyTextarea :value="description.value" :on-change="description.set" />
    </MyFormField>

    <!-- 子フォーム -->
    <section>
      <h2 class="text-xl font-semibold mb-2">参加表明に関する質問</h2>
      <CommitmentQuestions :store="commitment" />
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-2">アンケート</h2>
      <PreferenceQuestions :store="preference" />
    </section>

    <MyButton class="w-full" color="primary" @click="submit">オフ会を作成する</MyButton>

    <pre>{{ toPayload() }}</pre>
  </main>
</template>

<script setup lang="ts">
  import { OffkaiEventInitializeProps, useQuestionsForm } from "../composables"
  import CommitmentQuestions from "./CommitmentQuestions.vue"
  import PreferenceQuestions from "./PreferenceQuestions.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyTextarea from "@/common/components/MyTextarea.vue"
  import { watch } from "vue"
  import MyDatePicker from "@/common/components/MyDatePicker.vue"

  const { initialValue, handleSubmit } = defineProps<{
    initialValue: OffkaiEventInitializeProps,
    handleSubmit: (payload: unknown) => void
  }>()

  const {
    title,
    eventDate,
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
