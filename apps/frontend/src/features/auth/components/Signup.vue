<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl">ユーザー登録</h1>

    <MyFormField v-slot="{ id }" label="ログインID">
      <MyTextBox :id="id" :value="loginId" :on-change="v => loginId = v" :error="errors.loginId"
        :normalize-input="normalizeLoginIdInput"
        placeholder="例: kussy_tessy (DiscordのIDと同じにすることを推奨)" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="表示名">
      <MyTextBox :id="id" :value="name" :on-change="v => name = v" :error="errors.name" placeholder="例: くっしー" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="パスワード">
      <MyTextBox :id="id" type="password" :value="password" :on-change="v => password = v" :error="errors.password" />
    </MyFormField>

    <MyButton class="w-full" color="primary" @click="submit">
      登録する
    </MyButton>
  </main>
</template>

<script setup lang="ts">
  import { UserLoginIdSchema } from "@offkai/core"
  import { ref } from "vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import { isEmpty, useFieldErrorsComposable } from "@/common/composables"

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

  const { errors, reset, hasAny } = useFieldErrorsComposable()

  const normalizeLoginIdInput = (value: string) => {
    return value.replace(/[^A-Za-z0-9_]/g, "")
  }

  const validate = () => {
    reset()

    const normalizedLoginId = loginId.value.trim()

    if (isEmpty(normalizedLoginId)) {
      errors.value.loginId = "必須です"
    } else if (!UserLoginIdSchema.safeParse(normalizedLoginId).success) {
      errors.value.loginId = "半角英数字と_のみ使用できます"
    }
    if (isEmpty(name)) errors.value.name = "必須です"
    if (isEmpty(password)) errors.value.password = "必須です"

    return !hasAny()
  }

  const submit = async () => {
    if (!validate()) return
    await handleSubmit({
      loginId: loginId.value.trim(),
      name: name.value,
      password: password.value,
    })
  }
</script>
