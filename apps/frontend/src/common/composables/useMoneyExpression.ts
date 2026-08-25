import { reactive } from "vue";
import {
  ArithmeticExpressionError,
  containsArithmeticOperator,
  evaluateArithmeticExpression,
  formatArithmeticResult,
} from "@/common/utils/arithmeticExpression";

export const useMoneyExpression = (initialValue: string) => {
  const state = reactive({
    input: initialValue,
    value: initialValue ? Number(initialValue) : (null as number | null),
    expression: null as string | null,
    calculation: null as string | null,
    error: null as string | null,
    onInput: () => {
      state.value = null;
      state.expression = null;
      state.calculation = null;
      state.error = null;
    },
    onFocus: () => {
      if (state.expression) state.input = state.expression;
      state.calculation = null;
    },
    evaluate: () => {
      const source = state.input.trim();
      state.error = null;
      state.calculation = null;
      state.value = null;
      if (!source) return false;
      try {
        const result = evaluateArithmeticExpression(source);
        if (result < 0) {
          throw new ArithmeticExpressionError("計算結果は0円以上にしてください。");
        }
        const rounded = Math.round(result);
        if (!Number.isSafeInteger(rounded)) {
          throw new ArithmeticExpressionError("計算結果が大きすぎます。");
        }
        if (rounded < 1) {
          throw new ArithmeticExpressionError("計算結果は1円以上にしてください。");
        }
        state.value = rounded;
        state.expression = containsArithmeticOperator(source) ? source : null;
        state.input = String(rounded);
        state.calculation = state.expression
          ? `${state.expression} = ${formatArithmeticResult(result)}`
          : null;
        return true;
      } catch (cause) {
        state.expression = null;
        state.error =
          cause instanceof ArithmeticExpressionError
            ? cause.message
            : "数式を正しく入力してください。";
        return false;
      }
    },
  });

  return state;
};
