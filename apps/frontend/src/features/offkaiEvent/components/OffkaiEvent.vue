<template>
  <main class="space-y-4 md:space-y-6">
    <h1 class="text-3xl ">{{ isEdit ? 'オフ会の編集' : 'オフ会の作成' }}</h1>
    <MyFormField v-slot="{ id }" label="タイトル">
      <MyTextBox :id="id" :value="title.value" :on-change="title.set" :error="errors.title" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="開催日">
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <MyDatePicker :id="`${id}-start`" aria-label="開催開始日" :value="eventStartDate.value"
            :on-change="eventStartDate.set" :error="errors.eventStartDate" />
        </div>
        <span class="shrink-0 pt-2 text-gray-600">～</span>
        <div class="min-w-0 flex-1">
          <MyDatePicker :id="`${id}-end`" aria-label="開催終了日" :value="eventEndDate.value"
            :on-change="eventEndDate.set" :error="errors.eventEndDate" />
        </div>
      </div>
    </MyFormField>

    <MyFormField v-slot="{ id }" label="募集開始日時">
      <MyDatePicker :id="id" type="date" :value="applicationStartDate.value" :on-change="applicationStartDate.set"
        :error="errors.applicationStartDate" :includes-time="true" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="説明">
      <MyTextarea :id="id" :value="description.value" :on-change="description.set" rows="12" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="Discordロール">
      <MySelectBox
        :id="id"
        :value="selectedDiscordRoleId"
        :options="discordRoleOptions"
        :on-change="onDiscordRoleChange"
        :disabled="loadingDiscordRoles"
      />
    </MyFormField>

    <!-- 子フォーム -->
    <section>
      <h2 class="text-xl font-semibold mb-2">参加表明に関する質問</h2>
      <CommitmentQuestions :store="commitment" :errors="errors" />
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-2">アンケート</h2>
      <PreferenceQuestions :store="preference" :errors="errors" />
    </section>

    <section class="rounded-md border-2 border-teal-200 bg-teal-50 px-4 py-3 shadow-sm">
      <MyCheckbox
        class="text-base font-semibold text-slate-800"
        :value="askBringingKigurumi.value"
        :on-change="askBringingKigurumi.set"
      >
        連れてくる着ぐるみさんを聞く
      </MyCheckbox>
    </section>

    <MyButton class="w-full" color="primary" @click="submit">{{ isEdit ? 'オフ会を更新する' : 'オフ会を作成する' }}</MyButton>

  </main>
</template>

<script setup lang="ts">
  import type { ListDiscordRolesResponse } from "@offkai/core"
  import { computed, onMounted, ref, watch } from "vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyCheckbox from "@/common/components/MyCheckbox.vue"
  import MyDatePicker from "@/common/components/MyDatePicker.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue"
  import MyTextarea from "@/common/components/MyTextarea.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables"
  import { OffkaiEventInitializeProps, useQuestionsForm } from "../composables"
  import CommitmentQuestions from "./CommitmentQuestions.vue"
  import PreferenceQuestions from "./PreferenceQuestions.vue"

  const { initialValue, handleSubmit, isEdit = false } = defineProps<{
    initialValue: OffkaiEventInitializeProps,
    handleSubmit: (payload: unknown) => void,
    isEdit?: boolean
  }>()

  const {
    title,
    eventStartDate,
    eventEndDate,
    applicationStartDate,
    description,
    discordRoleId,
    askBringingKigurumi,
    commitment,
    preference,
    errors,
    initialize,
    toPayload,
    validate } = useQuestionsForm()

  const { get } = useApi()
  const { error } = useToast()
  const discordRoles = ref<ListDiscordRolesResponse["roles"]>([])
  const loadingDiscordRoles = ref(false)

  const selectedDiscordRoleId = computed(() => discordRoleId.value.value ?? "")

  const discordRoleOptions = computed<SelectOption[]>(() => [
    { value: "", label: "未設定" },
    ...discordRoles.value.map((role) => ({
      value: role.id,
      label: role.name,
    })),
  ])

  const onDiscordRoleChange = (value: string | number) => {
    const roleId = String(value)
    discordRoleId.set(roleId === "" ? null : roleId)
  }

  onMounted(async () => {
    loadingDiscordRoles.value = true
    try {
      const data = await get<ListDiscordRolesResponse>("/discord/roles")
      discordRoles.value = data?.roles ?? []
    } catch (cause) {
      error(getApiErrorMessage(cause, "Discordロール一覧の読み込みに失敗しました。"))
    } finally {
      loadingDiscordRoles.value = false
    }
  })


  watch(() => initialValue, () => {
    initialize(initialValue)
  }, { immediate: true })


  const submit = async () => {
    if (!validate()) return;
    await handleSubmit(toPayload())
  }
</script>
