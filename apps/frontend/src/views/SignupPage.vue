<template>
  <Signup :handleSubmit="handleSubmit" />
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router"
  import { getApiErrorMessage, useApi, useAuth, useToast } from "@/common/composables"

  import Signup from "@/features/auth/components/Signup.vue"

  const { post } = useApi()

  const router = useRouter()
  const { fetchMe } = useAuth()
  const { error } = useToast()

  const handleSubmit = async (payload: any) => {
    try {
      await post("/auth/register", payload)
      await fetchMe()
      router.push("/onboarding/discord")
    } catch (cause) {
      error(getApiErrorMessage(cause, "ユーザー登録に失敗しました。"))
    }
  }
</script>
