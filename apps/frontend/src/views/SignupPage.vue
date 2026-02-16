<template>
  <Signup :handleSubmit="handleSubmit" />
</template>

<script setup lang="ts">
  import { useRouter } from "vue-router"
  import { useApi, useAuth } from "@/common/composables"

  import Signup from "@/features/auth/components/Signup.vue"

  const { post } = useApi()

  const router = useRouter()
  const { fetchMe } = useAuth()

  const handleSubmit = async (payload: any) => {
    await post("/auth/register", payload)
    await fetchMe()
    router.push("/")
  }
</script>
