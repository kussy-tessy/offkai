<template>
  <div class="grid sm:grid-cols-2" :class="compact ? 'gap-2' : 'gap-4'">
    <MyFormField v-slot="{ id }" label="ダウンロード期日" :class="{ '!mb-2': compact }">
      <MyTextbox
        :id="id"
        :value="downloadDeadline.value"
        :on-change="downloadDeadline.set"
        :error="errors.downloadDeadline"
        maxlength="50"
        :placeholder="showPlaceholders ? '例：7月31日まで' : undefined"
      />
    </MyFormField>

    <MyFormField v-slot="{ id }" label="PASS" :class="{ '!mb-2': compact }">
      <MyTextbox
        :id="id"
        :value="password.value"
        :on-change="password.set"
        :error="errors.password"
        maxlength="50"
        autocomplete="off"
        :placeholder="showPlaceholders ? '必要な場合のみ' : undefined"
      />
    </MyFormField>
  </div>

  <MyFormField v-slot="{ id }" label="備考" :class="{ '!mb-2': compact }">
    <MyTextarea
      :id="id"
      :value="note.value"
      :on-change="note.set"
      :error="errors.note"
      maxlength="200"
      :rows="compact ? 2 : 3"
      :placeholder="showPlaceholders ? '補足事項があれば入力してください' : undefined"
    />
    <p class="mt-1 text-right text-xs text-slate-400">{{ noteLength }}/200</p>
  </MyFormField>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyTextarea from "@/common/components/MyTextarea.vue";
  import MyTextbox from "@/common/components/MyTextbox.vue";
  import type { PhotoShareForm } from "../composables";

  const props = withDefaults(defineProps<{
    form: PhotoShareForm;
    showPlaceholders?: boolean;
    compact?: boolean;
  }>(), {
    showPlaceholders: false,
    compact: false,
  });

  const { downloadDeadline, password, note, errors } = props.form;
  const noteLength = computed(() => note.value.value.length);
</script>
