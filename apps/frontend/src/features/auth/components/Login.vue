<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl">ログイン</h1>

    <MyFormField label="ログインID">
      <MyTextBox :value="loginId" :on-change="v => loginId = v" :error="errors.loginId" />
    </MyFormField>

    <MyFormField label="パスワード">
      <MyTextBox type="password" :value="password" :on-change="v => password = v" :error="errors.password" />
    </MyFormField>

    <MyButton class="w-full" color="primary" @click="submit">
      ログイン
    </MyButton>

    <MyButton class="w-full" color="secondary" variant="ghost" @click="goToSignup">
      新規登録
    </MyButton>
  </main>
</template>

<script setup lang="ts">
  import { ref } from "vue"
  import { useRouter } from "vue-router"
  import MyButton from "@/common/components/MyButton.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import { isEmpty, useFieldErrorsComposable } from "@/common/composables"

  const { handleSubmit } = defineProps<{
    handleSubmit: (payload: {
      loginId: string
      password: string
    }) => Promise<void>
  }>()

  const loginId = ref("")
  const password = ref("")
  const router = useRouter()

  const { errors, reset, hasAny } = useFieldErrorsComposable()

  const validate = () => {
    reset()

    if (isEmpty(loginId)) errors.value.loginId = "必須です"
    if (isEmpty(password)) errors.value.password = "必須です"

    return !hasAny()
  }

  const submit = async () => {
    if (!validate()) return
    await handleSubmit({
      loginId: loginId.value,
      password: password.value,
    })
  }

  const goToSignup = () => {
    router.push("/signup")
  }
</script>
