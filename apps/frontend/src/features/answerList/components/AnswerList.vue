<template>
  <header class="pb-8 mb-8 text-center space-y-4">
    <h1 class="text-4xl font-bold tracking-tight">{{ data.offkai.title }}</h1>
    <MyBadge :icon="faCalendar">開催日：{{ formatPeriodWithDay(data.offkai.eventPeriod) }}</MyBadge>
    <p v-if="data.offkai.description" class="text-gray-600 whitespace-pre-line text-left">{{ data.offkai.description }}
    </p>
    <hr class="border-teal-200 border-t-2" />
    <div class="flex flex-col items-center gap-2 pt-2">
      <MyButton :color="canAnswer ? 'primary' : 'gray'" size="lg" :disabled="!canAnswer"
        @click="router.push(`/offkai/${data.offkai.id}/join`)">
        <FontAwesomeIcon :icon="faPen" class="mr-2" />
        {{ hasAnswered ? '参加表明を編集する' : '参加する' }}
      </MyButton>
      <p v-if="!canAnswer" class="text-sm text-gray-500">
        募集開始前です。{{ formatWithDay(data.offkai.applicationStartDate, true) }} から参加表明できます。
      </p>
    </div>
  </header>

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
              <th class="p-2 text-left w-24 text-sm font-semibold">名前</th>
              <th v-for="q in data.commitmentQuestions" :key="q.id" class="p-2 w-24">
                <div class="font-semibold text-slate-800 text-xs">{{ q.questionShort }}</div>
              </th>
            </tr>
            <tr>
              <th class="p-1 text-right w-24 text-xs font-medium text-slate-600">定員</th>
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
              <th class="border-b border-teal-100 p-1 text-right w-24 text-xs font-medium text-slate-600">締切</th>
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
            <tr v-for="row in data.answers" :key="row.user.id"
              class="odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/40 transition-colors">
              <td class="border-b border-slate-100 p-2 text-left w-24 truncate font-medium text-slate-700 text-sm">
                {{ row.user.displayName }}
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

    <select v-model="selectedPreferenceId"
      class="w-full border border-sky-500 rounded px-3 py-2 mb-3 bg-white text-gray-600 font-medium shadow-sm">
      <option v-for="q in data.preferenceQuestions" :key="q.id" :value="q.id">
        {{ q.question }}
      </option>
    </select>

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
            <td class="border-b border-slate-100 p-2 text-gray-700">
              {{ row.preferenceAnswers[selectedPreferenceId] ?? "―" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>

<script setup lang="ts">
  import { faCircle } from "@fortawesome/free-regular-svg-icons";
  import { faCalendar, faPen, faUserGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { format, formatPeriodWithDay, formatWithDay, type OffkaiDetail, type Unbrand } from "@offkai/core";
  import { computed, ref } from "vue";
  import { useRouter } from "vue-router";
  import MyBadge from "@/common/components/MyBadge.vue";
  import MyButton from "@/common/components/MyButton.vue";
  import { useAuth } from "@/common/composables";

  const { data } = defineProps<{
    data: Unbrand<OffkaiDetail>;
  }>();

  const router = useRouter();
  const { user } = useAuth();

  const hasAnswered = computed(() =>
    user.value !== null && data.answers.some((a) => a.user.id === user.value!.id)
  );

  const canAnswer = computed(
    () => Date.now() >= new Date(data.offkai.applicationStartDate).getTime(),
  );

  const selectedPreferenceId = ref<string>(data.preferenceQuestions[0]?.id ?? "");

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
