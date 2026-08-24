<template>
  <Login :handleSubmit="handleSubmit" :handleDiscordLogin="loginWithDiscord" />
</template>

<script setup lang="ts">
  import { onMounted } from "vue"
  import { useRoute, useRouter } from "vue-router"
  import { getApiErrorMessage, useApi, useAuth, useToast } from "@/common/composables"
  import Login from "@/features/auth/components/Login.vue"

  const { post } = useApi()

  const router = useRouter()
	const route = useRoute()
  const { fetchMe, loginWithDiscord } = useAuth()
  const { error: showError } = useToast()

  const handleSubmit = async (payload: any) => {
    try {
      await post("/auth/login", payload)
      await fetchMe()
		const redirect = typeof route.query.redirect === "string"
			&& route.query.redirect.startsWith("/")
			&& !route.query.redirect.startsWith("//")
			? route.query.redirect
			: "/";
		await router.push(redirect)
    }
    catch (cause) {
      showError(getApiErrorMessage(
        cause,
        "ログイン処理でエラーが発生しました。時間を置いて再試行してください。",
      ))
    }
  }

  onMounted(() => {
    const result = typeof route.query.discord === "string" ? route.query.discord : null
    if (!result) return
    const messages: Record<string, string> = {
      cancelled: "Discordログインがキャンセルされました。",
      invalid_state: "Discordログインの有効期限が切れました。もう一度お試しください。",
      failed: "Discordログインに失敗しました。もう一度お試しください。",
    }
    if (messages[result]) showError(messages[result])
    const { discord: _discord, ...query } = route.query
    void router.replace({ query })
  })
</script>
