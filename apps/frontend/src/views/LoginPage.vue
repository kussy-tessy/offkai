<template>
  <Login :handleSubmit="handleSubmit" />
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router"
  import { useApi, useAuth } from "@/common/composables"
  import Login from "@/features/auth/components/Login.vue"

  const { post } = useApi()

  const router = useRouter()
  const { fetchMe } = useAuth()

  const handleSubmit = async (payload: any) => {
    await post("/auth/login", payload)
    await fetchMe()
    router.push("/")
  }
</script>
