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

    <MyFormField v-slot="{ id }" label="Discord ID">
      <MyTextBox
        :id="id"
        :value="discordUsername"
        :on-change="v => discordUsername = v"
        :error="errors.discordUsername"
        placeholder="例: kussy_tessy"
      />
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
  import { DiscordUsernameSchema, UserLoginIdSchema } from "@offkai/core"
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
      discordUsername: string | null
    }) => Promise<void>
  }>()

  const loginId = ref("")
  const name = ref("")
  const discordUsername = ref("")
  const password = ref("")

  const { errors, reset, hasAny } = useFieldErrorsComposable()

  const normalizeLoginIdInput = (value: string) => {
    return value.replace(/[^A-Za-z0-9_]/g, "")
  }

  const validate = () => {
    reset()

    const normalizedLoginId = loginId.value.trim()
    const normalizedDiscordUsername = discordUsername.value.trim().toLowerCase()

    if (isEmpty(normalizedLoginId)) {
      errors.value.loginId = "必須です"
    } else if (!UserLoginIdSchema.safeParse(normalizedLoginId).success) {
      errors.value.loginId = "半角英数字と_のみ使用できます"
    }
    if (isEmpty(name)) errors.value.name = "必須です"
    if (
      normalizedDiscordUsername &&
      !DiscordUsernameSchema.safeParse(normalizedDiscordUsername).success
    ) {
      errors.value.discordUsername = "2〜32文字の英小文字・数字・_・.で入力してください"
    }
    if (isEmpty(password)) errors.value.password = "必須です"

    return !hasAny()
  }

  const submit = async () => {
    if (!validate()) return
    await handleSubmit({
      loginId: loginId.value.trim(),
      name: name.value,
      password: password.value,
      discordUsername: discordUsername.value.trim().toLowerCase() || null,
    })
  }
</script>
