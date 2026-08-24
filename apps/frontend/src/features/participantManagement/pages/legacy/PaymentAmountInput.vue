<template>
  <div class="mx-auto min-w-24">
    <div class="flex items-center justify-center gap-1">
      <input
        :id="inputId"
        ref="inputElement"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        class="w-20 rounded-md border border-gray-300 px-2 py-1 text-right tabular-nums focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        :class="validationError ? 'border-red-500 focus:ring-red-500' : ''"
        :value="displayValue"
        :disabled="disabled || pending"
        :aria-label="`${displayName}さんの金額`"
        :aria-invalid="validationError ? 'true' : undefined"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
        @keydown.enter.prevent="onEnter"
        @keydown.esc.prevent="onEscape"
      />
      <span class="text-sm text-slate-600">円</span>
    </div>
    <p v-if="validationError" class="mt-1 text-xs text-red-600">
      {{ validationError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

const MAX_AMOUNT = 2_147_483_647;
const props = defineProps<{
  inputId: string;
  displayName: string;
  value: number;
  disabled?: boolean;
  save: (amount: number) => Promise<unknown>;
}>();
const emit = defineEmits<{
  navigate: [direction: 1 | -1];
}>();

const inputElement = ref<HTMLInputElement | null>(null);
const focused = ref(false);
const pending = ref(false);
const rawValue = ref(String(props.value));
const validationError = ref("");

const numericValue = computed(() => Number(rawValue.value || "0"));
const displayValue = computed(() =>
  focused.value
    ? rawValue.value
    : new Intl.NumberFormat("ja-JP").format(numericValue.value),
);

watch(
  () => props.value,
  (value) => {
    if (!focused.value && !pending.value) rawValue.value = String(value);
  },
);

const validate = () => {
  if (numericValue.value > MAX_AMOUNT) {
    validationError.value = "金額が上限を超えています";
    return false;
  }
  validationError.value = "";
  return true;
};

const onFocus = async () => {
  focused.value = true;
  rawValue.value = String(props.value);
  await nextTick();
  inputElement.value?.select();
};

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  rawValue.value = target.value.replace(/\D/g, "");
  target.value = rawValue.value;
  validate();
};

const commit = async () => {
  if (pending.value || !validate()) return false;
  const amount = numericValue.value;
  if (amount === props.value) {
    rawValue.value = String(amount);
    return true;
  }

  pending.value = true;
  try {
    await props.save(amount);
    rawValue.value = String(amount);
    return true;
  } catch {
    rawValue.value = String(props.value);
    return false;
  } finally {
    pending.value = false;
  }
};

const onBlur = () => {
  focused.value = false;
  void commit();
};

const onEnter = async (event: KeyboardEvent) => {
  const saved = await commit();
  if (saved) emit("navigate", event.shiftKey ? -1 : 1);
};

const onEscape = () => {
  rawValue.value = String(props.value);
  validationError.value = "";
  inputElement.value?.blur();
};
</script>
