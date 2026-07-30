<template>
	<div v-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
		{{ loadError }}
	</div>
	<AnswerList v-else-if="answerListData" :data="answerListData" />
</template>

<script setup lang="ts">
  import type { OffkaiDetail } from "@offkai/core";
	import { onMounted, ref } from "vue";
	import { useRouter } from "vue-router";
	import { getApiErrorMessage } from "@/common/composables";
  import { useApi } from '@/common/composables';
  import AnswerList from '@/features/answerList/components/AnswerList.vue';

  const { id } = defineProps<{
    id: string
  }>()

  const { get } = useApi();
	const router = useRouter();

  const answerListData = ref<OffkaiDetail | null>(null);
	const loadError = ref("");

  onMounted(async () => {
		try {
			const data = await get<OffkaiDetail>(`/offkai-event/${id}/detail`);
			if (data) answerListData.value = data;
		} catch (cause) {
			const status =
				typeof cause === "object" && cause !== null && "response" in cause
					? (cause as { response?: { status?: number } }).response?.status
					: undefined;
			if (status === 401) {
				await router.push({
					path: "/login",
					query: { redirect: router.currentRoute.value.fullPath },
				});
				return;
			}
			loadError.value = getApiErrorMessage(
				cause,
				"オフ会情報の読み込みに失敗しました。",
			);
		}
  });
</script>

<style scoped>
pre {
  background: #f7f7f7;
  padding: 1rem;
  border-radius: 8px;
}
</style>
