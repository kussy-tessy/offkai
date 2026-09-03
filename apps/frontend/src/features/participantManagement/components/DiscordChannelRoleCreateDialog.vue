<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div class="max-h-full w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl" role="dialog"
        aria-modal="true" aria-labelledby="discord-channel-role-dialog-title">
        <div class="space-y-5 px-6 py-5">
          <h2 id="discord-channel-role-dialog-title" class="text-lg font-semibold text-slate-900">
            チャンネル・ロールを作成
          </h2>

          <div v-if="loading" class="py-8 text-center text-sm text-slate-400">
            Discord設定を読み込み中…
          </div>

          <template v-else>
            <fieldset class="space-y-3">
              <legend class="text-sm font-semibold text-slate-800">チャンネル</legend>
              <MyRadioButton name="category-mode" value="create" :checked="categoryMode === 'create'"
                :on-change="() => (categoryMode = 'create')">
                新しいチャンネル
              </MyRadioButton>
              <div v-if="categoryMode === 'create'" class="ml-6 space-y-3">
                <MyFormField v-slot="{ id }" label="カテゴリ名">
                  <MyTextbox :id="id" :value="categoryName" :on-change="(value) => (categoryName = value)" />
                </MyFormField>

                <div class="space-y-2">
                  <div class="text-sm font-medium text-slate-700">チャンネル</div>
                  <div v-for="(_, index) in channelNames" :key="index" class="flex items-center gap-2">
                    <MyTextbox class="min-w-0 flex-1" :value="channelNames[index]"
                      :on-change="(value) => updateChannelName(index, value)" />
                    <MyButton type="button" color="gray" variant="ghost" size="sm" :disabled="channelNames.length === 1"
                      @click="removeChannel(index)">
                      削除
                    </MyButton>
                  </div>
                  <MyButton type="button" color="gray" variant="ghost" size="sm" :disabled="channelNames.length >= 10"
                    @click="channelNames.push('')">
                    ＋ チャンネルを追加
                  </MyButton>
                </div>
              </div>

              <MyRadioButton name="category-mode" value="existing" :checked="categoryMode === 'existing'"
                :disabled="categories.length === 0" :on-change="() => (categoryMode = 'existing')">
                既存のチャンネル
              </MyRadioButton>
              <div v-if="categoryMode === 'existing'" class="ml-6 space-y-2">
                <MySelectBox :value="categoryId" :options="categoryOptions"
                  :on-change="(value) => (categoryId = String(value))" />
                <div v-if="selectedCategory" class="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <div v-for="channel in selectedCategory.channels" :key="channel.id">
                    # {{ channel.name }}
                  </div>
                  <div v-if="selectedCategory.channels.length === 0" class="text-slate-400">
                    チャンネルはありません
                  </div>
                </div>
              </div>
            </fieldset>

            <div class="border-t border-slate-100" />

            <fieldset class="space-y-3">
              <legend class="text-sm font-semibold text-slate-800">ロール</legend>
              <MyRadioButton name="role-mode" value="create" :checked="roleMode === 'create'"
                :on-change="() => (roleMode = 'create')">
                新しいロール
              </MyRadioButton>
              <div v-if="roleMode === 'create'" class="ml-6">
                <MyFormField v-slot="{ id }" label="ロール名">
                  <MyTextbox :id="id" :value="roleName" :on-change="(value) => (roleName = value)" />
                </MyFormField>
              </div>

              <MyRadioButton name="role-mode" value="existing" :checked="roleMode === 'existing'"
                :disabled="roles.length === 0" :on-change="() => (roleMode = 'existing')">
                既存のロール
              </MyRadioButton>
              <div v-if="roleMode === 'existing'" class="ml-6">
                <MySelectBox :value="roleId" :options="roleOptions" :on-change="(value) => (roleId = String(value))" />
              </div>
            </fieldset>

            <p v-if="formError" class="text-sm text-rose-700">{{ formError }}</p>
          </template>
        </div>

        <div
          class="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <MyButton type="button" color="gray" variant="ghost" :disabled="creating" @click="close">
            キャンセル
          </MyButton>
          <MyButton type="button" :loading="creating" :disabled="loading || creating" @click="create">
            作成
          </MyButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import type {
    CreateDiscordChannelRoleResponse,
    GetDiscordChannelConfigurationResponse,
  } from "@offkai/core";
  import { computed, ref, watch } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyRadioButton from "@/common/components/MyRadioButton.vue";
  import MySelectBox, { type SelectOption } from "@/common/components/MySelectBox.vue";
  import MyTextbox from "@/common/components/MyTextbox.vue";
  import { getApiErrorMessage, useApi } from "@/common/composables";

  const props = defineProps<{
    open: boolean;
    eventId: string;
    roles: Array<{ id: string; name: string }>;
    selectedRoleId: string;
  }>();

  const emit = defineEmits<{
    "update:open": [open: boolean];
    created: [result: CreateDiscordChannelRoleResponse];
  }>();

  const { get, post } = useApi();
  const loading = ref(false);
  const creating = ref(false);
  const formError = ref("");
  const configuration = ref<GetDiscordChannelConfigurationResponse | null>(null);
  const categoryMode = ref<"create" | "existing">("create");
  const categoryName = ref("");
  const categoryId = ref("");
  const channelNames = ref(["雑談用", "連絡用"]);
  const roleMode = ref<"create" | "existing">("create");
  const roleName = ref("");
  const roleId = ref("");

  const categories = computed(() => configuration.value?.categories ?? []);
  const categoryOptions = computed<SelectOption[]>(() => [
    { value: "", label: "カテゴリを選択" },
    ...categories.value.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ]);
  const selectedCategory = computed(() =>
    categories.value.find((category) => category.id === categoryId.value),
  );
  const roleOptions = computed<SelectOption[]>(() => [
    { value: "", label: "ロールを選択" },
    ...props.roles.map((role) => ({ value: role.id, label: role.name })),
  ]);

  const loadConfiguration = async () => {
    loading.value = true;
    formError.value = "";
    try {
      const result = await get<GetDiscordChannelConfigurationResponse>(
        `/offkai-event/${props.eventId}/discord-channel-configuration`,
      );
      if (!result) throw new Error("Discord設定の取得結果が空です。");
      configuration.value = result;
      categoryMode.value = "create";
      categoryName.value = result.suggestedCategoryName;
      categoryId.value = "";
      channelNames.value = ["雑談用", "連絡用"];
      roleMode.value = props.selectedRoleId ? "existing" : "create";
      roleName.value = result.suggestedRoleName;
      roleId.value = props.selectedRoleId;
    } catch (cause) {
      formError.value = getApiErrorMessage(cause, "Discord設定の読み込みに失敗しました。");
    } finally {
      loading.value = false;
    }
  };

  watch(
    () => props.open,
    (open) => {
      if (open) void loadConfiguration();
    },
  );

  const updateChannelName = (index: number, value: string) => {
    channelNames.value[index] = value;
  };

  const removeChannel = (index: number) => {
    channelNames.value.splice(index, 1);
  };

  const validate = () => {
    if (categoryMode.value === "create") {
      if (!categoryName.value.trim()) return "カテゴリ名を入力してください。";
      if (channelNames.value.some((name) => !name.trim()))
        return "チャンネル名を入力してください。";
      const normalized = channelNames.value.map((name) => name.trim());
      if (new Set(normalized).size !== normalized.length)
        return "チャンネル名が重複しています。";
    } else if (!categoryId.value) {
      return "カテゴリを選択してください。";
    }
    if (roleMode.value === "create" && !roleName.value.trim())
      return "ロール名を入力してください。";
    if (roleMode.value === "existing" && !roleId.value)
      return "ロールを選択してください。";
    return "";
  };

  const create = async () => {
    formError.value = validate();
    if (formError.value) return;
    creating.value = true;
    try {
      const result = await post<CreateDiscordChannelRoleResponse>(
        `/offkai-event/${props.eventId}/discord-channel-role`,
        {
          category:
            categoryMode.value === "create"
              ? {
                mode: "create",
                name: categoryName.value.trim(),
                channelNames: channelNames.value.map((name) => name.trim()),
              }
              : { mode: "existing", categoryId: categoryId.value },
          role:
            roleMode.value === "create"
              ? { mode: "create", name: roleName.value.trim() }
              : { mode: "existing", roleId: roleId.value },
        },
        { timeout: 60000 },
      );
      if (!result) throw new Error("Discord設定の作成結果が空です。");
      emit("created", result);
      emit("update:open", false);
    } catch (cause) {
      formError.value = getApiErrorMessage(cause, "チャンネル・ロールの作成に失敗しました。");
    } finally {
      creating.value = false;
    }
  };

  const close = () => emit("update:open", false);
</script>
