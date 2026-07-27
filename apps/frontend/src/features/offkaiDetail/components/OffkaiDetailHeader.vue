<template>
  <header class="pb-8 mb-8 text-center space-y-4">
    <div class="flex flex-wrap items-start justify-center gap-2">
      <h1 class="text-4xl font-bold tracking-tight">{{ offkai.title }}</h1>
      <div v-if="offkai.canEdit" class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          aria-label="オフ会を編集する"
          title="オフ会を編集する"
          @click="router.push(`/offkai/${offkai.id}/edit`)"
        >
          <FontAwesomeIcon :icon="faPenToSquare" class="text-lg" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          aria-label="参加者を管理する"
          title="参加者を管理する"
          @click="router.push(`/offkai/${offkai.id}/participants`)"
        >
          <FontAwesomeIcon :icon="faUserGear" class="text-lg" />
        </button>
        <span class="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label="オフ会を削除する"
          title="オフ会を削除する"
          @click="confirmDeleteOpen = true"
        >
          <FontAwesomeIcon :icon="faTrash" class="text-lg" />
        </button>
      </div>
    </div>

    <MyBadge :icon="faCalendar">開催日：{{ formatPeriodWithDay(offkai.eventPeriod) }}</MyBadge>
    <p v-if="offkai.description" class="text-left text-gray-600 whitespace-pre-line">{{ offkai.description }}</p>
    <hr class="border-teal-200 border-t-2" />

    <div class="flex flex-col items-center gap-2 pt-2">
      <MyButton
        :color="canAnswer ? 'primary' : 'gray'"
        size="lg"
        :disabled="!canAnswer"
        @click="router.push(`/offkai/${offkai.id}/join`)"
      >
        <FontAwesomeIcon :icon="faPen" class="mr-2" />
        {{ hasAnswered ? '参加表明を編集する' : '参加する' }}
      </MyButton>
      <p v-if="!canAnswer" class="text-sm text-gray-500">
        募集開始前です。{{ formatWithDay(offkai.applicationStartDate, true) }} から参加表明できます。
      </p>
    </div>

    <nav v-if="hasAnswered" class="flex justify-center gap-1 pt-2" aria-label="オフ会コンテンツ">
      <RouterLink
        :to="`/offkai/${offkai.id}/detail`"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        :class="tabClass('answers')"
        :aria-current="activeTab === 'answers' ? 'page' : undefined"
      >
        <FontAwesomeIcon :icon="faClipboardList" />
        回答一覧
      </RouterLink>
      <RouterLink
        :to="`/offkai/${offkai.id}/photos`"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        :class="tabClass('photos')"
        :aria-current="activeTab === 'photos' ? 'page' : undefined"
      >
        <FontAwesomeIcon :icon="faImages" />
        写真共有
      </RouterLink>
    </nav>
  </header>

  <MyConfirmDialog
    v-model:open="confirmDeleteOpen"
    title="オフ会を削除しますか？"
    :message="`「${offkai.title}」を削除します。回答データも削除され、この操作は元に戻せません。`"
    confirm-label="削除する"
    confirm-color="red"
    :loading="deleting"
    @confirm="deleteEvent"
  />
</template>

<script setup lang="ts">
  import { faCalendar, faClipboardList, faImages, faPen, faPenToSquare, faTrash, faUserGear } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { formatPeriodWithDay, formatWithDay, type OffkaiDetail, type Unbrand } from "@offkai/core";
  import { computed, ref } from "vue";
  import { useRouter } from "vue-router";
  import MyBadge from "@/common/components/MyBadge.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyConfirmDialog from "@/common/components/MyConfirmDialog.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

  const props = defineProps<{
    offkai: Unbrand<OffkaiDetail>["offkai"];
    hasAnswered: boolean;
    activeTab: "answers" | "photos";
  }>();

  const router = useRouter();
  const { del } = useApi();
  const { success, error } = useToast();
  const confirmDeleteOpen = ref(false);
  const deleting = ref(false);
  const canAnswer = computed(
    () => Date.now() >= new Date(props.offkai.applicationStartDate).getTime(),
  );

  const tabClass = (tab: "answers" | "photos") =>
    props.activeTab === tab
      ? "border-teal-500 text-teal-700"
      : "border-transparent text-gray-500 hover:border-teal-200 hover:text-teal-700";

  const deleteEvent = async () => {
    if (deleting.value) return;
    deleting.value = true;
    try {
      await del(`/offkai-event/${props.offkai.id}`);
      success("オフ会を削除しました。");
      confirmDeleteOpen.value = false;
      await router.push("/dashboard");
    } catch (cause) {
      error(getApiErrorMessage(cause, "オフ会の削除に失敗しました。"));
    } finally {
      deleting.value = false;
    }
  };
</script>
