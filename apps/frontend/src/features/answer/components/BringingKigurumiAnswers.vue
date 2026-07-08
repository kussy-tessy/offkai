<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">連れてくる着ぐるみさん</h2>

    <div v-if="options.length === 0" class="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
      登録済みの着ぐるみさんはありません。
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="option in options"
        :key="option.id"
        class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2"
      >
        <MyCheckbox :value="isSelected(option)" :on-change="(checked) => toggle(option, checked)">
          {{ formatKigurumi(option) }}
        </MyCheckbox>
        <MyIconButton
          v-if="canManage"
          :label="`${formatKigurumi(option)}を削除`"
          color="red"
          variant="ghost"
          size="sm"
          :loading="deletingId === option.id"
          :disabled="deletingId !== null"
          :on-click="() => remove(option.id)"
        >
          <FontAwesomeIcon :icon="faTrash" />
        </MyIconButton>
      </div>
    </div>

    <form v-if="canManage" class="rounded-md border border-sky-100 bg-sky-50/40 p-4 space-y-3" @submit.prevent="add">
      <h3 class="font-semibold text-slate-800">未登録の着ぐるみさんを追加</h3>
      <div class="grid gap-3 md:grid-cols-2">
        <MyFormField v-slot="{ id }" label="作品名">
          <MyTextBox :id="id" :value="newTitle" :on-change="(value) => newTitle = value" :error="titleError" />
        </MyFormField>
        <MyFormField v-slot="{ id }" label="キャラクター名">
          <MyTextBox :id="id" :value="newCharacter" :on-change="(value) => newCharacter = value" :error="characterError" />
        </MyFormField>
      </div>
      <div class="flex justify-end">
        <MyButton type="submit" color="secondary" size="sm" :loading="adding" :disabled="adding">
          追加する
        </MyButton>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
  import { faTrash } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import type { BringingKigurumi, Kigurumi, Unbrand } from "@offkai/core";
  import { computed, ref } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyCheckbox from "@/common/components/MyCheckbox.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyIconButton from "@/common/components/MyIconButton.vue";
  import MyTextBox from "@/common/components/MyTextbox.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";

  type KigurumiOption = Unbrand<Kigurumi>;
  type BringingKigurumiValue = Unbrand<BringingKigurumi>;

  const props = defineProps<{
    options: KigurumiOption[];
    selected: BringingKigurumiValue[];
    canManage: boolean;
    onChange: (selected: BringingKigurumiValue[]) => void;
    onOptionsChange: (options: KigurumiOption[]) => void;
  }>();

  const { post, del } = useApi();
  const { success, error } = useToast();
  const newTitle = ref("");
  const newCharacter = ref("");
  const adding = ref(false);
  const deletingId = ref<string | null>(null);
  const attempted = ref(false);

  const titleError = computed(() =>
    attempted.value && newTitle.value.trim().length === 0 ? "作品名を入力してください" : undefined,
  );
  const characterError = computed(() =>
    attempted.value && newCharacter.value.trim().length === 0 ? "キャラクター名を入力してください" : undefined,
  );

  const toSnapshot = (value: { title: string; character: string }): BringingKigurumiValue => ({
    title: value.title,
    character: value.character,
  });

  const isSame = (a: BringingKigurumiValue, b: BringingKigurumiValue) =>
    a.title === b.title && a.character === b.character;

  const isSelected = (option: KigurumiOption) =>
    props.selected.some((selected) => isSame(selected, toSnapshot(option)));

  const formatKigurumi = (value: { title: string; character: string }) =>
    `${value.character}(${value.title})`;

  const toggle = (option: KigurumiOption, checked: boolean) => {
    const snapshot = toSnapshot(option);
    if (checked) {
      if (props.selected.some((selected) => isSame(selected, snapshot))) return;
      props.onChange([...props.selected, snapshot]);
      return;
    }
    props.onChange(props.selected.filter((selected) => !isSame(selected, snapshot)));
  };

  const add = async () => {
    attempted.value = true;
    const title = newTitle.value.trim();
    const character = newCharacter.value.trim();
    if (!title || !character || adding.value) return;

    adding.value = true;
    try {
      const created = await post<KigurumiOption>("/kigurumi", { title, character });
      if (!created) return;
      props.onOptionsChange([...props.options, created]);
      props.onChange([...props.selected, toSnapshot(created)]);
      newTitle.value = "";
      newCharacter.value = "";
      attempted.value = false;
      success("着ぐるみさんを追加しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "着ぐるみさんの追加に失敗しました。"));
    } finally {
      adding.value = false;
    }
  };

  const remove = async (id: string) => {
    if (deletingId.value !== null) return;
    deletingId.value = id;
    try {
      const target = props.options.find((option) => option.id === id);
      await del(`/kigurumi/${id}`);
      const nextOptions = props.options.filter((option) => option.id !== id);
      props.onOptionsChange(nextOptions);
      if (target) {
        const snapshot = toSnapshot(target);
        props.onChange(props.selected.filter((selected) => !isSame(selected, snapshot)));
      }
      success("着ぐるみさんを削除しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "着ぐるみさんの削除に失敗しました。"));
    } finally {
      deletingId.value = null;
    }
  };
</script>
