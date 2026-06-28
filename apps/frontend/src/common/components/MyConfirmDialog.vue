<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <div class="px-6 py-5">
          <h2 :id="titleId" class="text-lg font-semibold text-slate-900">{{ title }}</h2>
          <p v-if="message" class="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{{ message }}</p>
          <div v-if="$slots.default" class="mt-3 text-sm leading-6 text-slate-600">
            <slot />
          </div>
        </div>
        <div class="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <MyButton color="gray" variant="ghost" :disabled="loading" @click="cancel">
            {{ cancelLabel }}
          </MyButton>
          <MyButton :color="confirmColor" :loading="loading" :disabled="loading" @click="confirm">
            {{ confirmLabel }}
          </MyButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import MyButton from "@/common/components/MyButton.vue";

  const props = withDefaults(defineProps<{
    open: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: "primary" | "secondary" | "gray" | "red";
    loading?: boolean;
  }>(), {
    message: "",
    confirmLabel: "OK",
    cancelLabel: "キャンセル",
    confirmColor: "primary",
    loading: false,
  });

  const emit = defineEmits<{
    "update:open": [open: boolean];
    confirm: [];
    cancel: [];
  }>();

  const titleId = computed(() => `confirm-dialog-title-${props.title.replace(/\s+/g, "-")}`);

  const cancel = () => {
    emit("cancel");
    emit("update:open", false);
  };

  const confirm = () => {
    emit("confirm");
  };
</script>
