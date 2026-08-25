<template>
  <label class="block text-sm text-slate-600">
    {{ label }}
    <span class="mt-1 flex items-center gap-1">
      <input
        v-model="money.input"
        :required="required"
        type="text"
        inputmode="decimal"
        placeholder="数式も入力可能（例: 3500+218, 2100*1.08）"
        class="w-full rounded-md border bg-white px-3 py-2"
        :class="[
          money.error ? 'border-rose-400' : 'border-slate-300',
          align === 'right' ? 'text-right' : '',
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
import { useMoneyExpression } from "@/common/composables";

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    label: string;
    required?: boolean;
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

const money = useMoneyExpression(
  props.modelValue === null ? "" : String(props.modelValue),
);

const onInput = () => {
  money.onInput();
  emit("update:modelValue", null);
};

const evaluate = () => {
  const valid = money.evaluate();
  const value = valid ? money.value : null;
  emit("update:modelValue", value);
  return value;
};

defineExpose({ evaluate });
</script>
