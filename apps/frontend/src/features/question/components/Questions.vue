<template>
  <main class="p-4 space-y-6">
    <MyFormField label="タイトル">
      <MyTextBox v-model="title" />
    </MyFormField>

    <MyFormField label="開催日">
      <input type="date" v-model="date" class="border p-2 rounded-md w-full" />
    </MyFormField>

    <MyFormField label="説明">
      <textarea v-model="description" class="border p-2 rounded-md w-full" />
    </MyFormField>

    <!-- 子フォーム -->
    <section>
      <h2 class="text-xl font-semibold mb-2">Commitment Questions</h2>
      <CommitmentQuestions :store="commitment"/>
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-2">Preference Questions</h2>
      <PreferenceQuestions :store="preference"/>
    </section>

    <MyButton @click="submit">送信</MyButton>

    <pre>{{ toPayload() }}</pre>
  </main>
</template>

<script setup lang="ts">
import { useQuestionsForm } from "../composables"
import CommitmentQuestions from "./CommitmentQuestions.vue"
import PreferenceQuestions from "./PreferenceQuestions.vue"
import MyFormField from "@/common/components/MyFormField.vue"
import MyTextBox from "@/common/components/MyTextbox.vue"
import MyButton from "@/common/components/MyButton.vue"

const { title, date, description, commitment, preference, toPayload } = useQuestionsForm()

const submit = async () => {
  const payload = toPayload()
  console.log("送信データ:", payload)
  // await api.post("/events", payload)
}
</script>
