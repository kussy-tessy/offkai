<template>
  <OffkaiDetailHeader
    :offkai="data.offkai"
    :has-answered="hasAnswered"
    active-tab="answers"
  />

  <div v-if="data.answers.length === 0" class="py-16 flex flex-col items-center gap-3 text-gray-400">
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
              <th class="sticky left-0 z-20 bg-teal-50 p-2 text-left w-24 text-sm font-semibold [box-shadow:1px_0_0_0_theme(colors.teal.100)]">名前</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="p-2 w-24">
                <div class="font-semibold text-slate-800 text-xs">{{ q.questionShort }}</div>
              </th>
            </tr>
            <tr>
              <th class="sticky left-0 z-20 bg-teal-50 p-1 text-right w-24 text-xs font-medium text-slate-600 [box-shadow:1px_0_0_0_theme(colors.teal.100)]">定員</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="p-1 w-24">
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
              <th class="sticky left-0 z-20 bg-teal-50 border-b border-teal-100 p-1 text-right w-24 text-xs font-medium text-slate-600 [box-shadow:1px_0_0_0_theme(colors.teal.100)]">締切</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="border-b border-teal-100 p-1 w-24">
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
              <td class="sticky left-0 z-10 group-hover:bg-sky-50 border-b border-slate-100 p-2 text-left w-24 truncate font-medium text-slate-700 text-sm [box-shadow:1px_0_0_0_theme(colors.slate.100)]"
                :class="rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                <span>{{ row.user.displayName }}</span>
                <button v-if="data.offkai.canEdit" type="button" class="ml-2 text-sky-600 hover:text-sky-800"
                  :aria-label="`${row.user.displayName}さんの回答を編集`"
                  @click="router.push(`/offkai/${data.offkai.id}/answers/${row.user.id}/edit`)">
                  <FontAwesomeIcon :icon="faPenToSquare" />
                </button>
              </td>
              <td v-for="q in data.commitmentQuestions" :key="q.id" class="border-b border-slate-100 p-2 text-xl w-24">
                <span v-if="row.commitmentAnswers[q.id] === 'yes'">
                  <FontAwesomeIcon :icon="faCircle" class="text-sky-500" />
                </span>
                <span v-else-if="row.commitmentAnswers[q.id] === 'no'">
                  <FontAwesomeIcon :icon="faXmark" class="text-rose-500" />
                </span>
                <span v-else class="text-gray-500">―</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Preference -->
    <h2 class="text-xl font-semibold mb-2">アンケート</h2>

    <MySelectBox
      v-model="selectedPreferenceId"
      class="mb-3 border-sky-500 text-gray-600 font-medium shadow-sm focus:ring-sky-500"
      :options="preferenceOptions"
    />

    <div class="rounded-xl border border-teal-100 shadow-sm overflow-hidden">
      <table class="w-full border-collapse table-fixed">
        <thead class="bg-gradient-to-r from-teal-50 to-sky-50 border-b border-teal-100">
          <tr>
            <th class="border-b border-teal-100 p-2 text-left w-24">名前</th>
            <th class="border-b border-teal-100 p-2 text-left">回答</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data.answers" :key="row.user.id"
            class="odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/40 transition-colors">
            <td class="border-b border-slate-100 p-2 w-24 font-medium text-slate-700">{{ row.user.displayName }}</td>
            <td class="border-b border-slate-100 p-2 text-gray-700 whitespace-pre-line">
              {{ selectedAnswer(row) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>

<script setup lang="ts">
  import { faCircle } from "@fortawesome/free-regular-svg-icons";
  import { faPenToSquare, faUserGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { format, type OffkaiDetail, type Unbrand } from "@offkai/core";
  import { computed, ref } from "vue";
  import { useRouter } from "vue-router";
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue";
  import { useAuth } from "@/common/composables";
  import OffkaiDetailHeader from "@/features/offkaiDetail/components/OffkaiDetailHeader.vue";

  const { data } = defineProps<{
    data: Unbrand<OffkaiDetail>;
  }>();

  const router = useRouter();
  const { user } = useAuth();
  const hasAnswered = computed(() =>
    user.value !== null && data.answers.some((a) => a.user.id === user.value!.id)
  );

  const BRINGING_KIGURUMI_OPTION_ID = "__bringingKigurumi";

  const selectedPreferenceId = ref<string>(
    data.preferenceQuestions[0]?.id ?? (data.offkai.askBringingKigurumi ? BRINGING_KIGURUMI_OPTION_ID : ""),
  );
  const preferenceOptions = computed<SelectOption[]>(() => {
    const options = data.preferenceQuestions.map((q) => ({
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

  const selectedAnswer = (row: Unbrand<OffkaiDetail>["answers"][number]) => {
    if (selectedPreferenceId.value === BRINGING_KIGURUMI_OPTION_ID) {
      if (row.bringingKigurumis.length === 0) return "―";
      return row.bringingKigurumis
        .map((kigurumi) => `${kigurumi.character}(${kigurumi.title})`)
        .join("\n");
    }
    return row.preferenceAnswers[selectedPreferenceId.value] ?? "―";
  };

  const countYes = (questionId: string) => {
    return data.answers.filter((a: Unbrand<OffkaiDetail>["answers"][number]) => a.commitmentAnswers[questionId] === "yes")
      .length;
  };

  const capacityRate = (questionId: string, capacity: number | null) => {
    if (capacity === null || capacity <= 0) return 0;
    return Math.min(100, Math.round((countYes(questionId) / capacity) * 100));
  };

  const capacityBadgeClass = (questionId: string, capacity: number | null) => {
    if (capacity === null || capacity <= 0) return "bg-slate-100 text-slate-600";
    const yesCount = countYes(questionId);
    if (yesCount >= capacity) return "bg-rose-100 text-rose-700";
    if (yesCount / capacity >= 0.7) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const capacityBarClass = (questionId: string, capacity: number | null) => {
    if (capacity === null || capacity <= 0) return "bg-slate-300";
    const yesCount = countYes(questionId);
    if (yesCount >= capacity) return "bg-rose-400";
    if (yesCount / capacity >= 0.7) return "bg-amber-400";
    return "bg-emerald-400";
  };

  const remainingDays = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const deadlineLabel = (deadline: string) => {
    const days = remainingDays(deadline);
    if (days < 0) return "締切済み";
    if (days === 0) return "本日締切";
    return `あと${days}日`;
  };

  const deadlineBadgeClass = (deadline: string) => {
    const days = remainingDays(deadline);
    if (days < 0) return "bg-slate-200 text-slate-600";
    if (days === 0) return "bg-rose-100 text-rose-700";
    if (days <= 3) return "bg-amber-100 text-amber-700";
    return "bg-sky-100 text-sky-700";
  };
</script>
