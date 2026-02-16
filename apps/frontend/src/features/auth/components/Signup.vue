<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl">ユーザー登録</h1>

    <MyFormField label="ログインID">
      <MyTextBox :value="loginId" :on-change="v => loginId = v" :error="errors.loginId" />
    </MyFormField>

    <MyFormField label="表示名">
      <MyTextBox :value="name" :on-change="v => name = v" :error="errors.name" />
    </MyFormField>

    <MyFormField label="パスワード">
      <MyTextBox type="password" :value="password" :on-change="v => password = v" :error="errors.password" />
    </MyFormField>

    <MyButton class="w-full" color="primary" @click="submit">
      登録する
    </MyButton>
  </main>
</template>

<script setup lang="ts">
  import { ref } from "vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"

  const { handleSubmit } = defineProps<{
    handleSubmit: (payload: {
      loginId: string
      name: string
      password: string
    }) => Promise<void>
  }>()

  const loginId = ref("")
  const name = ref("")
  const password = ref("")

  const errors = ref<Record<string, string | undefined>>({})

  const validate = () => {
    errors.value = {}

    if (!loginId.value) errors.value.loginId = "必須です"
    if (!name.value) errors.value.name = "必須です"
    if (!password.value) errors.value.password = "必須です"

    return Object.keys(errors.value).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    await handleSubmit({
      loginId: loginId.value,
      name: name.value,
      password: password.value,
    })
  }
</script>
