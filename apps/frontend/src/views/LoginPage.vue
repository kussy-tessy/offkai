<template>
  <Login :handleSubmit="handleSubmit" />
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router"
  import { getApiErrorMessage, useApi, useAuth, useToast } from "@/common/composables"
  import Login from "@/features/auth/components/Login.vue"

  const { post } = useApi()

  const router = useRouter()
  const { fetchMe } = useAuth()
  const { error: showError } = useToast()

  const handleSubmit = async (payload: any) => {
    try {
      await post("/auth/login", payload)
      await fetchMe()
      router.push("/")
    }
    catch (cause) {
      showError(getApiErrorMessage(
        cause,
        "ログイン処理でエラーが発生しました。時間を置いて再試行してください。",
      ))
    }
  }
</script>
