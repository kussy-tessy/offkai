<template>
  <main ref="formElement" class="space-y-4 md:space-y-6">
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
        :error="errors.applicationStartDate" :includes-time="true" :initial-time="{ hours: 0, minutes: 0 }" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="説明">
      <MyTextarea :id="id" :value="description.value" :on-change="description.set" rows="12" />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="参加者向け案内">
      <MyTextarea
        :id="id"
        :value="participantDescription.value"
        :on-change="participantDescription.set"
        rows="8"
      />
      <p class="mt-1 text-sm text-slate-500">
        参加表明を送信したユーザーと運営者だけに表示されます。
      </p>
    </MyFormField>

    <section class="space-y-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
      <h2 class="text-xl font-semibold text-slate-800">公開範囲</h2>
      <MyFormField v-slot="{ id }" label="オフ会概要">
        <MySelectBox
          :id="id"
          :value="overviewVisibility.value"
					:options="overviewVisibilityOptions"
          :on-change="value => overviewVisibility.set(toVisibility(value))"
        />
      </MyFormField>
      <MyFormField v-slot="{ id }" label="参加者一覧・回答">
        <MySelectBox
          :id="id"
          :value="participantsVisibility.value"
          :options="visibilityOptions"
          :on-change="value => participantsVisibility.set(toVisibility(value))"
        />
				<p v-if="visibilityError" class="mt-1 text-sm text-red-600">
					{{ visibilityError }}
				</p>
      </MyFormField>
    </section>

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
  import type { EventVisibility } from "@offkai/core"
	import { isVisibilityAtLeastAsRestricted } from "@offkai/core"
  import { computed, nextTick, ref, watch } from "vue"
  import MyButton from "@/common/components/MyButton.vue"
  import MyCheckbox from "@/common/components/MyCheckbox.vue"
  import MyDatePicker from "@/common/components/MyDatePicker.vue"
  import MyFormField from "@/common/components/MyFormField.vue"
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue"
  import MyTextarea from "@/common/components/MyTextarea.vue"
  import MyTextBox from "@/common/components/MyTextbox.vue"
  import { useToast } from "@/common/composables"
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
    participantDescription,
    askBringingKigurumi,
		overviewVisibility,
		participantsVisibility,
    commitment,
    preference,
    errors,
    initialize,
    toPayload,
    validate } = useQuestionsForm()

  const { error } = useToast()
  const formElement = ref<HTMLElement | null>(null)
	const visibilityOptions: SelectOption[] = [
		{ value: "PUBLIC", label: "誰でも" },
		{ value: "AUTHENTICATED", label: "ログインユーザー" },
		{ value: "GUILD_MEMBERS", label: "Discordサーバー参加者" },
		{ value: "PARTICIPANTS", label: "オフ会参加表明者" },
	]
	const overviewVisibilityOptions = visibilityOptions.filter(
		(option) => option.value !== "PARTICIPANTS",
	)
	const toVisibility = (value: string | number): EventVisibility =>
		String(value) as EventVisibility

	const visibilityError = computed(() =>
		isVisibilityAtLeastAsRestricted(
			participantsVisibility.value.value,
			overviewVisibility.value.value,
		)
			? ""
			: "参加者一覧・回答の公開範囲は、オフ会概要と同じか、より限定してください",
	)

  watch(() => initialValue, () => {
    initialize(initialValue)
  }, { immediate: true })


  const submit = async () => {
    if (!validate()) {
      error("入力内容にエラーがあります。表示された項目をご確認ください。")
      await nextTick()
      formElement.value
        ?.querySelector<HTMLElement>(".text-red-600")
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    await handleSubmit(toPayload())
  }
</script>
