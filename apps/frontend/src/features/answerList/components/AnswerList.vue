<template>
  <OffkaiDetailHeader :offkai="data.offkai" :has-answered="hasAnswered"
    :can-view-participant-guide="data.viewer.permissions.canViewParticipantGuide"
    :can-manage-participants="canManageParticipants" />

  <section v-if="data.answers === null"
    class="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-600">
    <FontAwesomeIcon :icon="faUserGroup" class="mb-3 text-4xl text-slate-400" />
    <p class="font-medium">参加者一覧は公開されていません</p>
    <p v-if="data.participantsAccess.reason === 'AUTHENTICATION_REQUIRED'" class="mt-1 text-sm">
      参加者一覧を見るには
      <RouterLink :to="loginRoute" class="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
        ログイン
      </RouterLink>
      してください。
    </p>
    <p v-else class="mt-1 text-sm">
      {{ participantsAccessMessage }}
      <RouterLink v-if="data.participantsAccess.reason === 'DISCORD_NOT_CONNECTED'" to="/onboarding/discord"
        class="ml-1 font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
        Discordと連携する
      </RouterLink>
    </p>
  </section>

  <div v-else-if="data.answers.length === 0" class="py-16 flex flex-col items-center gap-3 text-gray-400">
    <FontAwesomeIcon :icon="faUserGroup" class="text-5xl" />
    <p class="text-lg font-medium">まだ参加者はいません</p>
    <p class="text-sm">最初の参加者になりましょう！</p>
  </div>

  <template v-else>
    <!-- Commitment -->
    <section class="mb-8">
      <h2 class="text-xl font-semibold mb-3">参加可否</h2>

      <div class="overflow-x-auto rounded-xl border border-teal-100 shadow-sm">
        <table class="w-full border-collapse text-center table-fixed">
          <thead class="bg-gradient-to-r from-teal-50 to-sky-50 align-top">
            <tr>
              <th
                class="sticky left-0 z-20 w-32 bg-teal-50 p-1 text-left text-sm font-semibold [box-shadow:1px_0_0_0_theme(colors.teal.100)]">
                名前</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="w-20 p-0">
                <div class="font-semibold text-slate-800 text-xs">{{ q.questionShort }}</div>
              </th>
              <th rowspan="3"
                class="w-44 border-b border-teal-100 px-2 py-1 align-middle text-sm font-semibold text-slate-800">
                参加表明時刻
              </th>
            </tr>
            <tr>
              <th
                class="sticky left-0 z-20 bg-teal-50 p-0 text-right w-24 text-xs font-medium text-slate-600 [box-shadow:1px_0_0_0_theme(colors.teal.100)]">
                定員</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="w-20 p-0">
                <div v-if="q.capacity !== null" class="flex justify-center">
                  <MyBadge size="sm" class="whitespace-nowrap" :color="capacityBadgeColor(countYes(q.id), q.capacity)">
                    {{ countYes(q.id) }}/{{ q.capacity }}
                  </MyBadge>
                </div>
                <div v-else class="text-[10px] text-slate-500 font-medium">なし</div>
              </th>
            </tr>
            <tr>
              <th
                class="sticky left-0 z-20 bg-teal-50 border-b border-teal-100 p-0 text-right w-24 text-xs font-medium text-slate-600 [box-shadow:1px_0_0_0_theme(colors.teal.100)]">
                締切</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="w-20 border-b border-teal-100 p-0">
                <div v-if="q.deadline" class="flex justify-center">
                  <MyBadge size="sm" class="whitespace-nowrap" :color="deadlineBadgeColor(q.deadline)">
                    {{ deadlineLabel(q.deadline) }}
                  </MyBadge>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in data.answers" :key="row.user.id"
              class="group odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/40 transition-colors">
              <td
                class="sticky left-0 z-10 w-32 border-b border-slate-100 p-1 text-left text-sm font-medium text-slate-700 group-hover:bg-sky-50 [box-shadow:1px_0_0_0_theme(colors.slate.100)]"
                :class="rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                <div class="flex min-w-0 items-center gap-1.5">
                  <DiscordAvatar :avatar-url="row.user.avatarUrl" :display-name="row.user.displayName" size="sm" />
                  <span class="truncate">{{ row.user.displayName }}</span>
                </div>
              </td>
              <td v-for="q in data.commitmentQuestions" :key="q.id" class="w-20 border-b border-slate-100 p-0 text-lg">
                <span v-if="row.commitmentAnswers[q.id] === 'yes'">
                  <FontAwesomeIcon :icon="faCircle" class="text-sky-500" />
                </span>
                <span v-else-if="row.commitmentAnswers[q.id] === 'no'">
                  <FontAwesomeIcon :icon="faXmark" class="text-rose-500" />
                </span>
                <span v-else class="text-gray-500">―</span>
              </td>
              <td class="w-44 whitespace-nowrap border-b border-slate-100 px-2 py-1 text-sm text-slate-600">
                {{ formatWithSeconds(row.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Preference -->
    <template v-if="data.viewer.permissions.canViewPrivateAnswers">
      <h2 class="text-xl font-semibold mb-2">アンケート</h2>

      <div class="mb-3 flex items-center gap-2">
        <MySelectBox v-model="selectedPreferenceId"
          class="min-w-0 flex-1 border-sky-500 text-gray-600 font-medium shadow-sm focus:ring-sky-500"
          :options="preferenceOptions" />
        <button type="button" aria-label="前の質問" title="前の質問"
          class="h-10 w-10 shrink-0 rounded border border-sky-200 text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="selectedPreferenceIndex <= 0" @click="movePreference(-1)">
          <span aria-hidden="true">▲</span>
        </button>
        <button type="button" aria-label="次の質問" title="次の質問"
          class="h-10 w-10 shrink-0 rounded border border-sky-200 text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="selectedPreferenceIndex < 0 || selectedPreferenceIndex >= preferenceOptions.length - 1" @click="movePreference(1)">
          <span aria-hidden="true">▼</span>
        </button>
      </div>

      <div class="rounded-xl border border-teal-100 shadow-sm overflow-hidden">
        <table class="w-full border-collapse table-fixed">
          <thead class="bg-gradient-to-r from-teal-50 to-sky-50 border-b border-teal-100">
            <tr>
              <th class="w-40 border-b border-teal-100 p-2 text-left">名前</th>
              <th class="border-b border-teal-100 p-2 text-left">回答</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.answers" :key="row.user.id"
              class="odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/40 transition-colors">
              <td class="w-40 border-b border-slate-100 p-2 font-medium text-slate-700">
                <div class="flex min-w-0 items-center gap-1.5">
                  <DiscordAvatar :avatar-url="row.user.avatarUrl" :display-name="row.user.displayName" size="sm" />
                  <button
                    type="button"
                    data-name-popover-trigger
                    class="min-w-0 truncate text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
                    aria-controls="participant-name-popover"
                    :aria-expanded="namePopover?.id === row.user.id"
                    @click="toggleNamePopover(row.user.id, row.user.displayName, $event)"
                  >{{ row.user.displayName }}</button>
                </div>
              </td>
              <td class="border-b border-slate-100 p-2 text-gray-700 whitespace-pre-line">
                <div v-if="selectedPreferenceId === BRINGING_KIGURUMI_OPTION_ID" class="space-y-2">
                  <template v-if="row.bringingKigurumis?.length">
                    <div v-for="(item, index) in row.bringingKigurumis" :key="item.kigurumiId ?? index">
                      <KigurumiImage v-if="item.kigurumiId && item.hasImage" :kigurumi-id="item.kigurumiId" :has-image="true"
                        :event-id="data.offkai.id" :label="`${item.character}(${item.title})`" />
                      <span v-else>{{ item.character }}({{ item.title }})</span>
                    </div>
                  </template>
                  <span v-else>―</span>
                </div>
                <MyBadge v-else-if="isChoiceQuestion && selectedAnswer(row) !== '―'" size="sm"
                  :color="badgeColor(selectedAnswer(row))">
                  {{ selectedAnswer(row) }}
                </MyBadge>
                <template v-else>{{ selectedAnswer(row) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </template>

  <Teleport to="body">
    <div
      v-if="namePopover"
      id="participant-name-popover"
      data-name-popover-content
      role="status"
      class="fixed z-[100] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-lg"
      :style="{ top: `${namePopover.top}px`, left: `${namePopover.left}px` }"
    >
      {{ namePopover.name }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import KigurumiImage from "@/features/kigurumi/components/KigurumiImage.vue";
  import { faCircle } from "@fortawesome/free-regular-svg-icons";
  import { faUserGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { formatWithSeconds, type OffkaiDetail, type Unbrand } from "@offkai/core";
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { useCommitmentStatusBadge } from "@/common/composables/useCommitmentStatusBadge";
  import DiscordAvatar from "@/common/components/DiscordAvatar.vue";
  import MyBadge from "@/common/components/MyBadge.vue";
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue";
  import { usePreferenceAnswerBadge } from "@/features/answerList/composables/usePreferenceAnswerBadge";
  import OffkaiDetailHeader from "@/features/offkaiDetail/components/OffkaiDetailHeader.vue";

  const { data } = defineProps<{
    data: Unbrand<OffkaiDetail>;
  }>();

  const namePopover = ref<{
    id: string;
    name: string;
    top: number;
    left: number;
  } | null>(null);
  function toggleNamePopover(id: string, name: string, event: MouseEvent) {
    if (namePopover.value?.id === id) {
      namePopover.value = null;
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    const left = Math.min(
      Math.max(16, rect.left),
      window.innerWidth - width - 16,
    );
    const top =
      rect.bottom + 8 + 48 < window.innerHeight
        ? rect.bottom + 8
        : Math.max(8, rect.top - 48);
    namePopover.value = { id, name, top, left };
  }
  function closeNamePopover(event: Event) {
    const target = event.target;
    if (
      target instanceof Element &&
      (target.closest("[data-name-popover-content]") ||
        target.closest("[data-name-popover-trigger]"))
    )
      return;
    namePopover.value = null;
  }
  function handlePopoverKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") namePopover.value = null;
  }
  function closePopoverOnViewportChange() {
    namePopover.value = null;
  }
  onMounted(() => {
    document.addEventListener("pointerdown", closeNamePopover);
    window.addEventListener("keydown", handlePopoverKeydown);
    window.addEventListener("scroll", closePopoverOnViewportChange, true);
    window.addEventListener("resize", closePopoverOnViewportChange);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", closeNamePopover);
    window.removeEventListener("keydown", handlePopoverKeydown);
    window.removeEventListener("scroll", closePopoverOnViewportChange, true);
    window.removeEventListener("resize", closePopoverOnViewportChange);
  });

  const hasAnswered = computed(() => data.viewer.isParticipant);
  const canManageParticipants = computed(
    () =>
      data.viewer.permissions.canManageDiscordRole ||
      data.viewer.permissions.canManagePayments,
  );
  const loginRoute = computed(() => ({
    path: "/login",
    query: { redirect: `/offkai/${data.offkai.id}/answers` },
  }));
  const participantsAccessMessage = computed(() => {
    switch (data.participantsAccess.reason) {
      case "DISCORD_NOT_CONNECTED":
        return "参加者一覧を見るにはDiscordアカウントの連携が必要です。";
      case "NOT_GUILD_MEMBER":
        return "参加者一覧はDiscordサーバー参加者に限定されています。";
      case "NOT_PARTICIPANT":
        return "参加者一覧はオフ会へ参加表明したユーザーに限定されています。";
      case "MEMBERSHIP_CHECK_UNAVAILABLE":
        return "Discordサーバーへの所属を一時的に確認できません。";
      default:
        return "";
    }
  });

  const BRINGING_KIGURUMI_OPTION_ID = "__bringingKigurumi";

  const selectedPreferenceId = ref<string>(
    data.preferenceQuestions?.[0]?.id ??
    (data.offkai.askBringingKigurumi ? BRINGING_KIGURUMI_OPTION_ID : ""),
  );
  const preferenceOptions = computed<SelectOption[]>(() => {
    const options = (data.preferenceQuestions ?? []).map((q) => ({
      value: q.id,
      label: q.question,
    }));
    if (data.offkai.askBringingKigurumi) {
      options.push({
        value: BRINGING_KIGURUMI_OPTION_ID,
        label: "連れてくる着ぐるみさんは？",
      });
    }
    return options;
  });
  const selectedPreferenceIndex = computed(() =>
    preferenceOptions.value.findIndex((option) => option.value === selectedPreferenceId.value),
  );
  const movePreference = (direction: -1 | 1) => {
    if (selectedPreferenceIndex.value < 0) return;
    const option = preferenceOptions.value[selectedPreferenceIndex.value + direction];
    if (option) selectedPreferenceId.value = String(option.value);
  };
  const selectedPreferenceQuestion = computed(
    () =>
      data.preferenceQuestions?.find(
        (question) => question.id === selectedPreferenceId.value,
      ) ?? null,
  );
  const { isChoiceQuestion, badgeColor } = usePreferenceAnswerBadge(
    selectedPreferenceQuestion,
  );

  const selectedAnswer = (
    row: NonNullable<Unbrand<OffkaiDetail>["answers"]>[number],
  ) => {
    if (selectedPreferenceId.value === BRINGING_KIGURUMI_OPTION_ID) {
      if (!row.bringingKigurumis || row.bringingKigurumis.length === 0) return "―";
      return row.bringingKigurumis
        .map((kigurumi) => `${kigurumi.character}(${kigurumi.title})`)
        .join("\n");
    }
    return row.preferenceAnswers?.[selectedPreferenceId.value] ?? "―";
  };

  const countYes = (questionId: string) => {
    return data.commitmentQuestions.find((question) => question.id === questionId)
      ?.yesCount ?? 0;
  };

  const { capacityBadgeColor, deadlineLabel, deadlineBadgeColor } = useCommitmentStatusBadge();
</script>
