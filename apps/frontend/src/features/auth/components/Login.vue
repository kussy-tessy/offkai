<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl">ログイン</h1>

    <MyButton class="w-full" color="discord" @click="handleDiscordLogin">
      <FontAwesomeIcon :icon="faDiscord" class="mr-2" />Discordで続ける
    </MyButton>
    <p class="text-sm text-slate-600">
      既存アカウントをお持ちの方は、先にログインしてアカウント設定からDiscordを連携してください。
    </p>
    <div class="flex items-center gap-3 text-sm text-slate-400" aria-hidden="true">
      <span class="h-px flex-1 bg-slate-200"></span><span>または</span><span class="h-px flex-1 bg-slate-200"></span>
    </div>

    <MyFormField v-slot="{ id }" label="ログインID">
      <MyTextBox :id="id" :value="loginId" :on-change="v => loginId = v" :error="errors.loginId" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="パスワード">
      <MyTextBox :id="id" type="password" :value="password" :on-change="v => password = v" :error="errors.password" />
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
  import { faDiscord } from "@fortawesome/free-brands-svg-icons/faDiscord"
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"
  import MyButton from "@/common/components/MyButton.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import { isEmpty, useFieldErrorsComposable } from "@/common/composables"

  const { handleSubmit, handleDiscordLogin } = defineProps<{
    handleSubmit: (payload: {
      loginId: string
      password: string
    }) => Promise<void>
    handleDiscordLogin: () => void
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
