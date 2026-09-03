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
                  <span class="px-1.5 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap"
                    :class="capacityBadgeClass(q.id, q.capacity)">
                    {{ countYes(q.id) }}/{{ q.capacity }}
                  </span>
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
                  <span class="px-1.5 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap"
                    :class="deadlineBadgeClass(q.deadline)">
                    {{ deadlineLabel(q.deadline) }}
                  </span>
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

      <MySelectBox v-model="selectedPreferenceId"
        class="mb-3 border-sky-500 text-gray-600 font-medium shadow-sm focus:ring-sky-500"
        :options="preferenceOptions" />

      <div class="rounded-xl border border-teal-100 shadow-sm overflow-hidden">
        <table class="w-full border-collapse table-fixed">
          <thead class="bg-gradient-to-r from-teal-50 to-sky-50 border-b border-teal-100">
            <tr>
              <th class="w-32 border-b border-teal-100 p-2 text-left">名前</th>
              <th class="border-b border-teal-100 p-2 text-left">回答</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.answers" :key="row.user.id"
              class="odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/40 transition-colors">
              <td class="w-32 border-b border-slate-100 p-2 font-medium text-slate-700">
                <div class="flex min-w-0 items-center gap-1.5">
                  <DiscordAvatar :avatar-url="row.user.avatarUrl" :display-name="row.user.displayName" size="sm" />
                  <span class="truncate">{{ row.user.displayName }}</span>
                </div>
              </td>
              <td class="border-b border-slate-100 p-2 text-gray-700 whitespace-pre-line">
                <MyBadge v-if="isChoiceQuestion && selectedAnswer(row) !== '―'" size="sm" variant="custom"
                  :class="badgeClass(selectedAnswer(row))">
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
</template>

<script setup lang="ts">
  import { faCircle } from "@fortawesome/free-regular-svg-icons";
  import { faUserGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { formatWithSeconds, type OffkaiDetail, type Unbrand } from "@offkai/core";
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import DiscordAvatar from "@/common/components/DiscordAvatar.vue";
  import MyBadge from "@/common/components/MyBadge.vue";
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue";
  import { usePreferenceAnswerBadge } from "@/features/answerList/composables/usePreferenceAnswerBadge";
  import OffkaiDetailHeader from "@/features/offkaiDetail/components/OffkaiDetailHeader.vue";

  const { data } = defineProps<{
    data: Unbrand<OffkaiDetail>;
  }>();

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
  const selectedPreferenceQuestion = computed(
    () =>
      data.preferenceQuestions?.find(
        (question) => question.id === selectedPreferenceId.value,
      ) ?? null,
  );
  const { isChoiceQuestion, badgeClass } = usePreferenceAnswerBadge(
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

  const capacityBadgeClass = (questionId: string, capacity: number | null) => {
    if (capacity === null || capacity <= 0) return "bg-slate-100 text-slate-600";
    const yesCount = countYes(questionId);
    if (yesCount >= capacity) return "bg-rose-100 text-rose-700";
    if (yesCount / capacity >= 0.7) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;
  const JST_OFFSET_MS = 9 * HOUR_MS;

  const now = ref(Date.now());
  let clockTimer: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    clockTimer = setInterval(() => {
      now.value = Date.now();
    }, 60 * 1000);
  });

  onUnmounted(() => {
    if (clockTimer !== undefined) clearInterval(clockTimer);
  });

  const calendarDaysUntil = (deadlineTime: number) => {
    const todayInJst = Math.floor((now.value + JST_OFFSET_MS) / DAY_MS);
    const deadlineDateInJst = Math.floor((deadlineTime + JST_OFFSET_MS) / DAY_MS);
    return deadlineDateInJst - todayInJst;
  };

  const deadlineLabel = (deadline: string) => {
    const deadlineTime = new Date(deadline).getTime();
    const remainingMs = deadlineTime - now.value;
    if (remainingMs < 0) return "締切済み";

    const days = calendarDaysUntil(deadlineTime);
    if (days === 0) {
      if (remainingMs < HOUR_MS) return "まもなく";
      return `あと${Math.ceil(remainingMs / HOUR_MS)}時間`;
    }
    return `あと${days}日`;
  };

  const deadlineBadgeClass = (deadline: string) => {
    const deadlineTime = new Date(deadline).getTime();
    if (deadlineTime < now.value) return "bg-slate-200 text-slate-600";

    const days = calendarDaysUntil(deadlineTime);
    if (days === 0) return "bg-rose-100 text-rose-700";
    if (days <= 3) return "bg-amber-100 text-amber-700";
    return "bg-sky-100 text-sky-700";
  };
</script>
