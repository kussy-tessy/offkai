export class ArithmeticExpressionError extends Error {}

export const evaluateArithmeticExpression = (source: string): number => {
  if (source.length > 100) {
    throw new ArithmeticExpressionError("計算式は100文字以内で入力してください。");
  }

  let position = 0;
  const skipSpaces = () => {
    while (/\s/u.test(source[position] ?? "")) position += 1;
  };
  const consume = (token: string) => {
    skipSpaces();
    if (source[position] !== token) return false;
    position += 1;
    return true;
  };
  const expression = (): number => {
    let value = term();
    while (true) {
      if (consume("+")) value += term();
      else if (consume("-")) value -= term();
      else return value;
    }
  };
  const term = (): number => {
    let value = unary();
    while (true) {
      if (consume("*")) value *= unary();
      else if (consume("/")) {
        const divisor = unary();
        if (divisor === 0) {
          throw new ArithmeticExpressionError("0で割ることはできません。");
        }
        value /= divisor;
      } else return value;
    }
  };
  const unary = (): number => {
    if (consume("+")) return unary();
    if (consume("-")) return -unary();
    return primary();
  };
  const primary = (): number => {
    skipSpaces();
    if (consume("(")) {
      const value = expression();
      if (!consume(")")) {
        throw new ArithmeticExpressionError("閉じ括弧が不足しています。");
      }
      return value;
    }

    skipSpaces();
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)/u.exec(source.slice(position));
    if (!match) {
      throw new ArithmeticExpressionError("数式を正しく入力してください。");
    }
    position += match[0].length;
    return Number(match[0]);
  };

  skipSpaces();
  if (position === source.length) {
    throw new ArithmeticExpressionError("金額を入力してください。");
  }
  const result = expression();
  skipSpaces();
  if (position !== source.length) {
    throw new ArithmeticExpressionError("使用できる記号は + - * / ( ) です。");
  }
  if (!Number.isFinite(result)) {
    throw new ArithmeticExpressionError("計算結果が大きすぎます。");
  }
  return result;
};

export const containsArithmeticOperator = (source: string) => {
  const trimmed = source.trim();
  return /[+*/()]/u.test(trimmed) || trimmed.slice(1).includes("-");
};

export const formatArithmeticResult = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    useGrouping: false,
    maximumFractionDigits: 10,
  }).format(value);
