<template>
  <!-- ヘッダ -->
  <header class="pb-4">
    <h1 class="text-4xl font-bold">{{ data.offkai.title }}</h1>
    <p class="text-sm text-gray-500">
      開催日：{{ formatDate(data.offkai.eventDate) }}
    </p>
    <p class="text-gray-600">{{ data.offkai.description }}</p>
  </header>

  <!-- Commitment -->
  <section>
    <h2 class="text-xl font-semibold mb-2">参加可否</h2>

    <table class="border-collapse text-center table-fixed mb-4">
      <thead class="bg-teal-100">
        <tr>
          <th class="border-t border-b p-2 text-left w-32">名前</th>
          <th v-for="q in data.commitmentQuestions" :key="q.id" class="border-t border-b p-2 w-36">
            <div>{{ q.label }}</div>
            <div class="text-xs text-gray-500">
              <span v-if="q.capacity !== null">
                {{ countYes(q.id) }}/{{ q.capacity }}
              </span>
              <span v-if="q.deadline">
                （{{ formatDate(q.deadline) }}締切）
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data.answers" :key="row.user.id" class="odd:bg-white even:bg-gray-50">
          <td class="border-t border-b p-2 text-left w-32 truncate">
            {{ row.user.displayName }}
          </td>
          <td v-for="q in data.commitmentQuestions" :key="q.id" class="border-t border-b p-2 text-xl w-">
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
  </section>

  <!-- Preference -->
  <h2 class="text-xl font-semibold mb-2">アンケート</h2>

  <select v-model="selectedPreferenceId" class="border border-sky-500 rounded px-2 py-1 mb-3 bg-white text-gray-600">
    <option v-for="q in data.preferenceQuestions" :key="q.id" :value="q.id">
      {{ q.label }}
    </option>
  </select>

  <table class="border-collapse w-full table-fixed">
    <thead class="bg-teal-100">
      <tr>
        <th class="border-b p-2 text-left w-24">名前</th>
        <th class="border-b p-2 text-left w-64">回答</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in data.answers" :key="row.user.id" class="odd:bg-white even:bg-gray-50">
        <td class="border-b p-2 w-24">{{ row.user.displayName }}</td>
        <td class="border-b p-2 w-64">
          {{ row.preferenceAnswers[selectedPreferenceId] ?? "―" }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import { OffkaiAnswerList, Unbrand } from "@offkai/core";
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faCircle } from '@fortawesome/free-regular-svg-icons';
  import { faXmark } from '@fortawesome/free-solid-svg-icons';

  const { data } = defineProps<{
    data: Unbrand<OffkaiAnswerList>;
  }>();


  const selectedPreferenceId = ref(
    data.preferenceQuestions[0]?.id
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const countYes = (questionId: string) => {
    return data.answers.filter(
      (a) => a.commitmentAnswers[questionId] === "yes"
    ).length;
  };
</script>
