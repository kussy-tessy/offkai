<template>
  <label class="block text-sm text-slate-600">
    <span :class="hideLabel ? 'sr-only' : ''">{{ label }}</span>
    <span :class="compact ? 'flex items-center gap-1' : 'mt-1 flex items-center gap-1'">
      <input
        ref="inputElement"
        v-model="money.input"
        :required="required"
        :aria-label="label"
        type="text"
        inputmode="decimal"
        placeholder="数式も入力可能（例: 3500+218, 2100*1.08）"
        class="w-full rounded-md border bg-white px-3 py-2"
        :class="[
          money.error ? 'border-rose-400' : 'border-slate-300',
          align === 'right' ? 'text-right' : '',
          compact ? '!py-1 !px-2' : '',
        ]"
        @input="onInput"
        @focus="money.onFocus"
        @blur="evaluate"
      />
      <span v-if="suffix">{{ suffix }}</span>
    </span>
    <span v-if="money.error" class="mt-1 block text-xs text-rose-600">
      {{ money.error }}
    </span>
    <span
      v-else-if="money.calculation"
      class="mt-1 block text-xs text-slate-400"
    >
      {{ money.calculation }}
    </span>
  </label>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useMoneyExpression } from "@/common/composables";

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    label: string;
    required?: boolean;
    allowZero?: boolean;
    live?: boolean;
    compact?: boolean;
    hideLabel?: boolean;
    suffix?: string;
    align?: "left" | "right";
  }>(),
  {
    required: false,
    suffix: "",
    align: "left",
  },
);
const emit = defineEmits<{
  "update:modelValue": [value: number | null];
}>();

const inputElement = ref<HTMLInputElement>();
const money = useMoneyExpression(
  props.modelValue === null ? "" : String(props.modelValue),
  props.allowZero,
);

const onInput = () => {
  money.onInput();
  if (props.live) {
    const source = money.input;
    const valid = money.evaluate();
    money.input = source;
    inputElement.value?.setCustomValidity(valid ? "" : money.error ?? "金額を入力してください。");
    emit("update:modelValue", valid ? money.value : null);
  } else emit("update:modelValue", null);
};

const evaluate = () => {
  const valid = money.evaluate();
  const value = valid ? money.value : null;
  if (props.live) inputElement.value?.setCustomValidity(valid ? "" : money.error ?? "金額を入力してください。");
  emit("update:modelValue", value);
  return value;
};

watch(() => props.modelValue, value => {
  if (!props.live || value === null || value === money.value || document.activeElement === inputElement.value) return;
  money.input = String(value);
  money.onInput();
  money.value = value;
  inputElement.value?.setCustomValidity("");
});
defineExpose({ evaluate });
</script>
