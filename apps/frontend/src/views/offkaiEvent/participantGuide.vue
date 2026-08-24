<template>
  <div v-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
    {{ loadError }}
  </div>
  <template v-else-if="detail && guide">
    <OffkaiDetailHeader
      :offkai="detail.offkai"
      :has-answered="detail.viewer.isParticipant"
      :can-view-participant-guide="detail.viewer.permissions.canViewParticipantGuide"
      :can-manage-participants="detail.viewer.permissions.canManageDiscordRole || detail.viewer.permissions.canManagePayments"
    />

    <section class="space-y-6">
      <div v-if="detail.viewer.permissions.canEditEvent" class="flex justify-center">
        <MyButton color="secondary" variant="ghost" @click="router.push(`/offkai/${id}/participant-guide/edit`)">
          <FontAwesomeIcon :icon="faPenToSquare" class="mr-2" />参加者向け情報を編集
        </MyButton>
      </div>

      <p v-if="guide.description" class="whitespace-pre-line text-gray-600">
        <LinkifiedText :text="guide.description" />
      </p>
      <div v-else class="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">
        参加者向け情報はまだ登録されていません。
      </div>
    </section>
  </template>
</template>

<script setup lang="ts">
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import type { OffkaiDetail, ParticipantGuideResponse, Unbrand } from "@offkai/core";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import LinkifiedText from "@/common/components/LinkifiedText.vue";
import MyButton from "@/common/components/MyButton.vue";
import { getApiErrorMessage, useApi } from "@/common/composables";
import OffkaiDetailHeader from "@/features/offkaiDetail/components/OffkaiDetailHeader.vue";

const { id } = defineProps<{ id: string }>();
const router = useRouter();
const { get } = useApi();
const detail = ref<Unbrand<OffkaiDetail> | null>(null);
const guide = ref<ParticipantGuideResponse | null>(null);
const loadError = ref("");

onMounted(async () => {
  try {
    const [loadedDetail, loadedGuide] = await Promise.all([
      get<Unbrand<OffkaiDetail>>(`/offkai-event/${id}/detail`),
      get<ParticipantGuideResponse>(`/offkai-event/${id}/participant-guide`),
    ]);
    detail.value = loadedDetail;
    guide.value = loadedGuide;
  } catch (cause) {
    loadError.value = getApiErrorMessage(cause, "参加者向け情報の読み込みに失敗しました。");
  }
});
</script>
