<template>
  <div
    class="fixed inset-0 z-50 !m-0 flex justify-end bg-black/30"
    @click.self="emit('close')"
  >
    <section
      role="dialog"
      aria-modal="true"
      :aria-label="heading"
      :class="tone ? `finance-drawer finance-drawer--${tone}` : undefined"
      class="w-full max-w-2xl h-full overflow-auto bg-white p-5 shadow-xl"
    >
      <div
        class="sticky top-0 z-30 bg-white py-3 flex justify-between items-center mb-4"
      >
        <h3 class="text-xl font-bold">
          {{ heading
          }}<span
            v-if="context"
            class="block text-sm text-teal-700"
            >{{ context }}</span
          >
        </h3>
        <MyButton
          type="button"
          @click="emit('close')"
          size="sm"
          variant="ghost"
          color="gray"
          >閉じる</MyButton
        >
      </div>
      <form
        class="space-y-4"
        @submit.prevent="emit('submit')"
      >
        <p
          v-if="error"
          role="alert"
          class="rounded bg-red-50 p-3 text-red-700"
        >
          {{ error }}
        </p>
        <slot />
        <div class="sticky bottom-0 flex gap-3 bg-white py-3 border-t">
          <MyButton
            type="submit"
            :disabled="busy || submitDisabled"
            size="sm"
          >
            {{ busy ? "保存中…" : "保存" }}</MyButton
          >
          <MyButton
            type="button"
            @click="emit('close')"
            size="sm"
            variant="ghost"
            color="gray"
            >キャンセル</MyButton
          >
        </div>
      </form>
    </section>
  </div>
</template>
<script setup lang="ts">
import MyButton from "@/common/components/MyButton.vue";

defineProps<{
  heading: string;
  tone?: "income" | "expense";
  context?: string;
  busy: boolean;
  error: string;
  submitDisabled?: boolean;
}>();
const emit = defineEmits<{ close: []; submit: [] }>();
</script>

<style>
.finance-drawer {
  background: #fafcfb;
}

.finance-drawer > div:first-child {
  margin: -1.25rem -1.25rem 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #dce9e5;
}

.finance-drawer > div:first-child {
  background: white;
  color: #334155;
}

.finance-drawer form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-drawer form > * {
  margin-top: 0;
  margin-bottom: 0;
}

.finance-drawer fieldset {
  border-radius: 0.875rem;
}

.finance-drawer legend {
  font-weight: 600;
  padding: 0 0.375rem;
  color: #415b55;
}

.finance-drawer input:not([type="checkbox"]):not([type="radio"]),
.finance-drawer textarea,
.finance-drawer select {
  border: 1px solid #cbdad5;
  border-radius: 0.5rem;
  padding: 0.625rem;
  background: white;
}

.finance-drawer input:focus-visible,
.finance-drawer textarea:focus-visible,
.finance-drawer select:focus-visible {
  outline: 2px solid #5a9d8a;
  outline-offset: 2px;
}

.finance-drawer .allocation-row {
  display: flex;
  padding: 0.25rem 0.5rem;
}

.finance-drawer .allocation-row input {
  width: 6rem;
  margin: 0;
  padding: 0.25rem 0.5rem;
}
</style>
