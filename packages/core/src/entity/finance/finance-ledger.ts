import { z } from "zod";

const id = z.string().min(1).max(100);
const money = z.number().int().min(0).max(1_000_000_000);
const signedMoney = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const title = z.string().trim().min(1).max(200);
const note = z.string().max(2000).default("");
export const LedgerAllocationSchema = z.object({
  mode: z.enum(["weights", "fixed"]),
  rows: z
    .array(
      z.object({ personId: id, value: z.number().min(0).max(1_000_000_000) }),
    )
    .max(2000),
});
export const LedgerCategorySchema = z.object({
  id,
  questionId: id.nullable().optional(),
  name: title,
  baseAmount: money,
  memberIds: z.array(id).max(2000),
});
export const LedgerItemSchema = z.object({
  id,
  categoryId: id,
  name: title,
  allocation: LedgerAllocationSchema,
});
export const LedgerChargeSchema = z.object({
  id,
  personId: id,
  categoryId: id.nullable(),
  title,
  amount: money,
  note,
  confirmed: z.boolean().default(true),
  usesBaseAmount: z.boolean().optional(),
  isBase: z.boolean().optional(),
});
export const LedgerExpenseSchema = z.object({
  id,
  categoryId: id.nullable(),
  itemId: id.nullable().default(null),
  title,
  amount: money,
  kind: z.enum(["expense", "cooperation", "independent"]),
  allocation: LedgerAllocationSchema,
  payerId: id.nullable(),
  recipients: z.array(z.object({ personId: id, amount: money })),
  note,
});
export const LedgerIncomeSchema = z.object({
  id,
  categoryId: id,
  title,
  amount: money,
  allocation: LedgerAllocationSchema,
  note,
});
export const LedgerAdjustmentSchema = z.object({
  id,
  personId: id,
  mode: z.enum(["delta", "fixed"]),
  amount: signedMoney,
  note,
});
export const LedgerPaymentSchema = z.object({
  id,
  kind: z.enum(["collection", "refund", "recovery", "expense", "income"]),
  referenceId: id,
  amount: money.refine((v) => v > 0, "金額は1円以上です。"),
  at: z.string().datetime(),
  note,
  migrated: z.boolean().default(false),
});
export const LedgerPersonSchema = z.object({
  id,
  name: title,
  settlementStarted: z.boolean().optional(),
});
export const LedgerSnapshotSchema = z.object({
  at: z.string().datetime(),
  actorId: id,
  inputRevision: z.number().int(),
  targets: z.record(z.number().int()),
  migrated: z.boolean().default(false),
});
export const FinanceLedgerSchema = z.object({
  version: z.literal(1),
  inputRevision: z.number().int().nonnegative(),
  roundingUnit: z.union([
    z.literal(1),
    z.literal(10),
    z.literal(100),
    z.literal(500),
  ]),
  people: z.array(LedgerPersonSchema),
  categories: z.array(LedgerCategorySchema),
  items: z.array(LedgerItemSchema),
  charges: z.array(LedgerChargeSchema),
  expenses: z.array(LedgerExpenseSchema),
  incomes: z.array(LedgerIncomeSchema),
  adjustments: z.array(LedgerAdjustmentSchema),
  payments: z.array(LedgerPaymentSchema),
  snapshot: LedgerSnapshotSchema.nullable(),
  migrationNotes: z.array(z.string()),
});
export type FinanceLedger = z.infer<typeof FinanceLedgerSchema>;
export type LedgerAllocation = z.infer<typeof LedgerAllocationSchema>;
export type LedgerPayment = z.infer<typeof LedgerPaymentSchema>;
export type LedgerResource =
  | "categories"
  | "items"
  | "charges"
  | "expenses"
  | "incomes"
  | "adjustments"
  | "payments";
export const LedgerResourceSchema = z.enum([
  "categories",
  "items",
  "charges",
  "expenses",
  "incomes",
  "adjustments",
  "payments",
]);
const baseCommand = {
  revision: z.number().int().nonnegative(),
  requestId: z.string().uuid(),
};
export const ParticipantChargesInputSchema = z.object({
  personId: id,
  baseChanges: z
    .array(z.object({ categoryId: id, amountOverride: money.nullable(), note }))
    .max(2000),
  extras: z
    .array(
      z.object({ id, categoryId: id.nullable(), title, amount: money, note }),
    )
    .max(2000),
});
export type ParticipantChargesInput = z.infer<
  typeof ParticipantChargesInputSchema
>;
export const LedgerCommandSchema = z.discriminatedUnion("action", [
  z.object({
    ...baseCommand,
    action: z.literal("startSettlement"),
    personId: id,
  }),
  z.object({
    ...baseCommand,
    action: z.literal("participantCharges"),
    ...ParticipantChargesInputSchema.shape,
  }),
  z.object({
    ...baseCommand,
    action: z.literal("put"),
    resource: LedgerResourceSchema,
    value: z.unknown(),
    payment: LedgerPaymentSchema.optional(),
  }),
  z.object({
    ...baseCommand,
    action: z.literal("remove"),
    resource: LedgerResourceSchema,
    id,
  }),
  z.object({ ...baseCommand, action: z.literal("confirm") }),
  z.object({
    ...baseCommand,
    action: z.literal("rounding"),
    unit: z.union([
      z.literal(1),
      z.literal(10),
      z.literal(100),
      z.literal(500),
    ]),
  }),
  z.object({ ...baseCommand, action: z.literal("confirmCharges") }),
  z.object({
    ...baseCommand,
    action: z.literal("refundPlanned"),
    personId: id,
  }),
  z.object({
    ...baseCommand,
    action: z.literal("collectPlanned"),
    personId: id,
    includeIndependent: z.boolean().optional(),
  }),
  z.object({
    ...baseCommand,
    action: z.literal("createCategoryCharges"),
    categoryId: id.optional(),
  }),
]);
export type LedgerCommand = z.infer<typeof LedgerCommandSchema>;
export const ledgerResourceSchemas = {
  categories: LedgerCategorySchema,
  items: LedgerItemSchema,
  charges: LedgerChargeSchema,
  expenses: LedgerExpenseSchema,
  incomes: LedgerIncomeSchema,
  adjustments: LedgerAdjustmentSchema,
  payments: LedgerPaymentSchema,
};

// Exact fractions keep allocation and final rounding independent of expense ordering.
class Fraction {
  constructor(
    readonly n: bigint,
    readonly d: bigint = 1n,
  ) {}
  add(b: Fraction): Fraction {
    let n = this.n * b.d + b.n * this.d;
    let d = this.d * b.d;
    let a = n < 0n ? -n : n;
    let c = d;
    while (c) [a, c] = [c, a % c];
    const divisor = a || 1n;
    n /= divisor;
    d /= divisor;
    return new Fraction(n, d);
  }
  negate() {
    return new Fraction(-this.n, this.d);
  }
  number() {
    return (
      Number(this.n / this.d) +
      Number(((this.n % this.d) * 1_000_000_000n) / this.d) / 1_000_000_000
    );
  }
  floor(unit: number) {
    const denominator = this.d * BigInt(unit);
    const q =
      this.n >= 0n
        ? this.n / denominator
        : -((-this.n + denominator - 1n) / denominator);
    const result = Number(q * BigInt(unit));
    if (!Number.isSafeInteger(result))
      throw new Error("精算金額が大きすぎます。");
    return result;
  }
}
const frac = (n: number) => new Fraction(BigInt(n));
function allocate(amount: number, allocation: LedgerAllocation) {
  const rows = allocation.rows;
  if (new Set(rows.map((r) => r.personId)).size !== rows.length)
    throw new Error("配分対象者が重複しています。");
  if (allocation.mode === "fixed") {
    if (rows.some((r) => !Number.isSafeInteger(r.value)))
      throw new Error("指定額は整数円で入力してください。");
    const total = rows.reduce((s, r) => s + r.value, 0);
    if (total > amount) throw new Error("配分額が総額を超えています。");
    return {
      values: rows.map((r) => ({ personId: r.personId, value: frac(r.value) })),
      unallocated: amount - total,
    };
  }
  const weights = rows.map((r) => {
    const value = Math.round(r.value * 1000);
    if (Math.abs(value / 1000 - r.value) > 1e-9)
      throw new Error("重みは小数第3位までです。");
    return BigInt(value);
  });
  const total = weights.reduce((s, v) => s + v, 0n);
  return {
    values: rows.map((r, i) => ({
      personId: r.personId,
      value: total ? new Fraction(BigInt(amount) * weights[i], total) : frac(0),
    })),
    unallocated: total ? 0 : amount,
  };
}
/** Basic charge identities survive withdrawal; only the effective amount becomes zero. */
export function effectiveChargeAmount(
  ledger: FinanceLedger,
  charge: z.infer<typeof LedgerChargeSchema>,
) {
  const category = ledger.categories.find((c) => c.id === charge.categoryId);
  if (charge.isBase && !category?.memberIds.includes(charge.personId)) return 0;
  return charge.usesBaseAmount && category
    ? category.baseAmount
    : charge.amount;
}

export function syncBasicCharges(ledger: FinanceLedger) {
  const before = JSON.stringify(ledger.charges);
  for (const category of ledger.categories) {
    for (const personId of category.memberIds) {
      if (
        !ledger.charges.some(
          (c) =>
            c.isBase && c.categoryId === category.id && c.personId === personId,
        )
      ) {
        ledger.charges.push({
          id: `base:${category.id}:${personId}`,
          personId,
          categoryId: category.id,
          title: category.name,
          amount: category.baseAmount,
          note: "",
          confirmed: true,
          usesBaseAmount: true,
          isBase: true,
        });
      }
    }
    for (const charge of ledger.charges.filter(
      (c) => c.isBase && c.categoryId === category.id,
    )) {
      charge.title = category.name;
      if (charge.usesBaseAmount) charge.amount = category.baseAmount;
    }
  }
  return before !== JSON.stringify(ledger.charges);
}

export function validateFinanceLedger(ledger: FinanceLedger): void {
  const people = new Set(ledger.people.map((p) => p.id));
  const categories = new Set(ledger.categories.map((c) => c.id));
  const person = (value: string) => {
    if (!people.has(value)) throw new Error("参加者が見つかりません。");
  };
  const category = (value: string) => {
    if (!categories.has(value)) throw new Error("精算区分が見つかりません。");
  };
  for (const list of [
    ledger.people,
    ...Object.keys(ledgerResourceSchemas).map(
      (key) => ledger[key as LedgerResource],
    ),
  ]) {
    if (new Set(list.map((row) => row.id)).size !== list.length)
      throw new Error("明細IDが重複しています。");
  }
  const checkAllocation = (amount: number, allocation: LedgerAllocation) => {
    allocation.rows.forEach((r) => {
      person(r.personId);
    });
    allocate(amount, allocation);
  };
  for (const c of ledger.categories) {
    c.memberIds.forEach(person);
    if (new Set(c.memberIds).size !== c.memberIds.length)
      throw new Error("区分の参加者が重複しています。");
  }
  for (const item of ledger.items) {
    category(item.categoryId);
    checkAllocation(1_000_000_000, item.allocation);
  }
  const basicKeys = new Set<string>();
  for (const charge of ledger.charges) {
    if (charge.isBase) {
      if (!charge.categoryId)
        throw new Error("基本請求には精算区分が必要です。");
      const key = JSON.stringify([charge.categoryId, charge.personId]);
      if (basicKeys.has(key))
        throw new Error("同じ参加者・区分の基本請求が重複しています。");
      basicKeys.add(key);
    }
    if (charge.usesBaseAmount && !charge.categoryId)
      throw new Error("基本参加費を使う請求には精算区分が必要です。");
    person(charge.personId);
    if (charge.categoryId) category(charge.categoryId);
  }
  for (const expense of ledger.expenses) {
    if (expense.categoryId) category(expense.categoryId);
    if (expense.kind !== "independent" && !expense.categoryId)
      throw new Error("精算区分を選択してください。");
    if (
      expense.kind === "independent" &&
      (expense.categoryId || expense.payerId || expense.recipients.length)
    )
      throw new Error("別会計の支払いは区分・立替者・受取人を指定できません。");
    if (
      expense.itemId &&
      !ledger.items.some(
        (i) => i.id === expense.itemId && i.categoryId === expense.categoryId,
      )
    )
      throw new Error("費目の精算区分が一致しません。");
    if (expense.payerId) person(expense.payerId);
    expense.recipients.forEach((r) => {
      person(r.personId);
    });
    if (expense.kind === "cooperation") {
      if (
        expense.payerId ||
        expense.recipients.reduce((s, r) => s + r.amount, 0) !==
          expense.amount ||
        new Set(expense.recipients.map((r) => r.personId)).size !==
          expense.recipients.length
      )
        throw new Error("協力金の受取人別金額を確認してください。");
    } else if (expense.recipients.length)
      throw new Error("受取人は協力金に指定してください。");
    if (expense.kind !== "independent")
      checkAllocation(expense.amount, expense.allocation);
  }
  ledger.incomes.forEach((i) => {
    category(i.categoryId);
    checkAllocation(i.amount, i.allocation);
  });
  ledger.adjustments.forEach((a) => {
    person(a.personId);
  });
  if (
    new Set(ledger.adjustments.map((a) => a.personId)).size !==
    ledger.adjustments.length
  )
    throw new Error("手動調整は1人につき1件にまとめてください。");
  for (const p of ledger.payments) {
    if (p.kind === "collection") {
      if (!ledger.charges.some((c) => c.id === p.referenceId))
        throw new Error("徴収対象の請求が見つかりません。");
    } else if (p.kind === "refund" || p.kind === "recovery")
      person(p.referenceId);
    else if (p.kind === "expense") {
      if (
        !ledger.expenses.some(
          (e) =>
            e.id === p.referenceId && !e.payerId && e.kind !== "cooperation",
        )
      )
        throw new Error("この経費は参加者への精算で支払います。");
    } else if (p.kind === "income") {
      if (!ledger.incomes.some((i) => i.id === p.referenceId))
        throw new Error("収入明細が見つかりません。");
    }
  }
  const paid = (kind: LedgerPayment["kind"], referenceId: string) =>
    ledger.payments
      .filter((p) => p.kind === kind && p.referenceId === referenceId)
      .reduce((s, p) => s + p.amount, 0);
  for (const e of ledger.expenses)
    if (paid("expense", e.id) > e.amount)
      throw new Error("経費の支払額が明細金額を超えています。");
  for (const i of ledger.incomes)
    if (paid("income", i.id) > i.amount)
      throw new Error("徴収額が収入明細を超えています。");
}
export function calculateFinanceLedger(ledger: FinanceLedger) {
  validateFinanceLedger(ledger);

  const costs = new Map(ledger.people.map((p) => [p.id, frac(0)]));
  const benefits = new Map(ledger.people.map((p) => [p.id, frac(0)]));
  const receivables = new Map(ledger.people.map((p) => [p.id, 0]));
  const breakdowns = new Map(
    ledger.people.map((p) => [
      p.id,
      [] as Array<{
        title: string;
        kind: string;
        amount: number;
        categoryId: string | null;
        weight?: number;
      }>,
    ]),
  );
  const unallocated: Array<{
    id: string;
    title: string;
    amount: number;
    kind: string;
  }> = [];
  const distribute = (
    row: FinanceLedger["expenses"][number] | FinanceLedger["incomes"][number],
    kind: "expense" | "income",
  ) => {
    const allocation = allocate(row.amount, row.allocation);
    if (allocation.unallocated)
      unallocated.push({
        id: row.id,
        title: row.title,
        amount: allocation.unallocated,
        kind,
      });
    for (const share of allocation.values) {
      const map = kind === "expense" ? costs : benefits;
      map.set(share.personId, map.get(share.personId)!.add(share.value));
      breakdowns.get(share.personId)!.push({
        title: row.title,
        kind,
        amount: share.value.number(),
        categoryId: row.categoryId,
        ...(row.allocation.mode === "weights"
          ? {
              weight: row.allocation.rows.find(
                (allocationRow) => allocationRow.personId === share.personId,
              )?.value,
            }
          : {}),
      });
    }
  };
  for (const e of ledger.expenses) {
    if (e.kind === "independent") continue;
    distribute(e, "expense");
    const recipients = e.payerId
      ? [{ personId: e.payerId, amount: e.amount }]
      : e.recipients;
    for (const r of recipients) {
      receivables.set(r.personId, receivables.get(r.personId)! + r.amount);
      breakdowns.get(r.personId)!.push({
        title: e.title,
        categoryId: e.categoryId,
        kind: e.payerId ? "reimbursement" : "cooperation",
        amount: r.amount,
      });
    }
  }
  ledger.incomes.forEach((i) => {
    distribute(i, "income");
  });
  const paid = (kind: LedgerPayment["kind"], referenceId: string) =>
    ledger.payments
      .filter((p) => p.kind === kind && p.referenceId === referenceId)
      .reduce((s, p) => s + p.amount, 0);
  const charges = ledger.charges.map((c) => ({
    ...c,
    amount: effectiveChargeAmount(ledger, c),
    received: paid("collection", c.id),
    remaining: effectiveChargeAmount(ledger, c) - paid("collection", c.id),
  }));
  const participants = ledger.people.map((p) => {
    const ownCharges = charges.filter((c) => c.personId === p.id);
    const baseCharges = ownCharges.filter((c) => c.categoryId !== null);
    const charged = baseCharges.reduce((s, c) => s + c.amount, 0);
    const received = baseCharges.reduce((s, c) => s + c.received, 0);
    const cost = costs.get(p.id)!;
    const benefit = benefits.get(p.id)!;
    const receivable = receivables.get(p.id)!;
    const automatic = frac(charged)
      .add(cost.negate())
      .add(benefit)
      .add(frac(receivable))
      .floor(ledger.roundingUnit);
    const adjustment = ledger.adjustments.find((a) => a.personId === p.id);
    const proposedRefund =
      adjustment?.mode === "fixed"
        ? adjustment.amount
        : automatic + (adjustment?.amount ?? 0);
    const proposedTarget = charged - proposedRefund;
    const acceptedTarget = unallocated.length ? null : proposedTarget;
    const refunded = paid("refund", p.id);
    const recovered = paid("recovery", p.id);
    return {
      ...p,
      settlementStarted: hasStartedSettlement(ledger, p.id),
      charged,
      received,
      cost: cost.number(),
      benefit: benefit.number(),
      receivable,
      automatic,
      proposedRefund,
      proposedTarget,
      acceptedTarget,
      refunded,
      recovered,
      proposedRemaining: received + recovered - refunded - proposedTarget,
      remaining:
        acceptedTarget === null
          ? null
          : received + recovered - refunded - acceptedTarget,
      independentOutstanding: ownCharges
        .filter((c) => !c.categoryId)
        .reduce((s, c) => s + c.remaining, 0),
      independentUncollected: ownCharges
        .filter((c) => !c.categoryId)
        .reduce((sum, c) => sum + Math.max(0, c.remaining), 0),
      independentOvercollected: ownCharges
        .filter((c) => !c.categoryId)
        .reduce((sum, c) => sum + Math.max(0, -c.remaining), 0),
      breakdowns: breakdowns.get(p.id)!,
    };
  });
  const spent = ledger.expenses
    .filter((e) => !e.payerId && e.kind !== "cooperation")
    .reduce((sum, e) => sum + e.amount, 0);
  // Expense records themselves are the cash outflow. Historical expense payments
  // remain readable but must never subtract the same expense a second time.
  const cash = ledger.payments
    .filter((p) => p.kind !== "expense")
    .reduce(
      (s, p) =>
        s +
        (["collection", "recovery", "income"].includes(p.kind)
          ? p.amount
          : -p.amount),
      0,
    );
  const cashAfterExpenses = cash - spent;
  const independentReceived = charges
    .filter((c) => !c.categoryId)
    .reduce((s, c) => s + c.received, 0);
  const independentPaid = ledger.expenses
    .filter((e) => e.kind === "independent")
    .reduce((s, e) => s + e.amount, 0);
  const expenseOutstanding = 0;
  const incomeOutstanding = ledger.incomes.reduce(
    (s, i) => s + i.amount - paid("income", i.id),
    0,
  );
  const independentOutstanding = participants.reduce(
    (s, p) => s + p.independentOutstanding,
    0,
  );
  const projected =
    cashAfterExpenses +
    incomeOutstanding +
    independentOutstanding -
    expenseOutstanding -
    participants.reduce((s, p) => s + p.proposedRemaining, 0);
  return {
    participants,
    charges,
    unallocated,
    cash: cashAfterExpenses,
    independentCash: independentReceived - independentPaid,
    expenseOutstanding,
    incomeOutstanding,
    projected,
    stale: false,
  };
}
export type LedgerCalculation = ReturnType<typeof calculateFinanceLedger>;

/** A shortcut records each outstanding charge separately in one atomic command. */
export function hasStartedSettlement(ledger: FinanceLedger, personId: string) {
  return (
    Boolean(ledger.people.find((p) => p.id === personId)?.settlementStarted) ||
    ledger.payments.some(
      (p) =>
        (p.kind === "refund" || p.kind === "recovery") &&
        p.referenceId === personId,
    )
  );
}

export function getPlannedCollection(
  ledger: FinanceLedger,
  personId: string,
  includeIndependent = false,
) {
  const participationCharges = ledger.charges.filter(
    (c) => c.personId === personId && c.categoryId !== null,
  );
  const charges = includeIndependent
    ? ledger.charges.filter((c) => c.personId === personId)
    : participationCharges;
  const outstanding = charges
    .map((c) => ({
      ...c,
      remaining:
        effectiveChargeAmount(ledger, c) -
        ledger.payments
          .filter((p) => p.kind === "collection" && p.referenceId === c.id)
          .reduce((sum, p) => sum + p.amount, 0),
    }))
    .filter((c) => c.remaining > 0);
  const amount = outstanding.reduce((sum, c) => sum + c.remaining, 0);
  const reason = !participationCharges.length
    ? "請求がありません"
    : !amount
      ? "徴収済みです。訂正は受け渡し履歴から行えます"
      : "";
  return {
    outstanding,
    amount,
    hasCharges: participationCharges.length > 0,
    complete: participationCharges.length > 0 && amount === 0,
    eligible: reason === "",
    reason,
  };
}

export function getPlannedRefund(remaining: number | null) {
  const reason =
    remaining === null
      ? "未配分の明細を解消してください"
      : remaining < 0
        ? "追加徴収が必要です"
        : remaining === 0
          ? "返金する残額はありません。訂正は受け渡し履歴から行えます"
          : "";
  return {
    amount: Math.max(remaining ?? 0, 0),
    eligible: reason === "",
    complete: remaining === 0,
    reason,
  };
}

export function applyLedgerCommand(
  input: FinanceLedger,
  command: LedgerCommand,
  actorId: string,
  at: string,
): FinanceLedger {
  const ledger = structuredClone(input);
  for (const person of ledger.people) {
    if (hasStartedSettlement(ledger, person.id))
      person.settlementStarted = true;
  }
  if (command.action === "participantCharges") {
    if (!ledger.people.some((p) => p.id === command.personId))
      throw new Error("参加者が見つかりません。");
    if (
      new Set(command.baseChanges.map((r) => r.categoryId)).size !==
        command.baseChanges.length ||
      new Set(command.extras.map((r) => r.id)).size !== command.extras.length
    )
      throw new Error("請求の指定が重複しています。");
    for (const change of command.baseChanges) {
      const category = ledger.categories.find(
        (c) => c.id === change.categoryId,
      );
      const charge = ledger.charges.find(
        (c) =>
          c.isBase &&
          c.categoryId === change.categoryId &&
          c.personId === command.personId,
      );
      if (!category?.memberIds.includes(command.personId) || !charge)
        throw new Error(
          "請求対象外の区分は編集できません。参加回答を確認してください。",
        );
      charge.usesBaseAmount = change.amountOverride === null;
      charge.amount = change.amountOverride ?? category.baseAmount;
      charge.note = change.note;
    }
    const oldExtras = ledger.charges.filter(
      (c) => c.personId === command.personId && !c.isBase,
    );
    for (const old of oldExtras) {
      if (
        !command.extras.some((c) => c.id === old.id) &&
        ledger.payments.some(
          (p) => p.kind === "collection" && p.referenceId === old.id,
        )
      )
        throw new Error(
          "徴収記録がある追加請求は削除できません。金額の訂正か徴収記録の確認を行ってください。",
        );
    }
    const nextExtras = command.extras.map((extra) => {
      const old = ledger.charges.find((c) => c.id === extra.id);
      if (old && (old.personId !== command.personId || old.isBase))
        throw new Error("別の参加者や基本請求は変更できません。");
      if (
        old &&
        old.categoryId !== extra.categoryId &&
        ledger.payments.some(
          (p) => p.kind === "collection" && p.referenceId === old.id,
        )
      )
        throw new Error("徴収済みの追加請求の精算区分は変更できません。");
      return {
        ...extra,
        personId: command.personId,
        confirmed: true,
        usesBaseAmount: false,
        isBase: false,
      };
    });
    ledger.charges = [
      ...ledger.charges.filter(
        (c) => c.personId !== command.personId || c.isBase,
      ),
      ...nextExtras,
    ];
    ledger.inputRevision++;
  } else if (command.action === "put") {
    const value = ledgerResourceSchemas[command.resource].parse(command.value);
    if (command.resource === "payments") {
      const payment = LedgerPaymentSchema.parse(value);
      const old = ledger.payments.find((p) => p.id === payment.id);
      payment.migrated = old?.migrated ?? false;
      Object.assign(value, payment);
      if (
        old &&
        (old.kind !== payment.kind || old.referenceId !== payment.referenceId)
      )
        throw new Error(
          "受け渡し先の変更は、誤記録を削除して登録し直してください。",
        );
      if (!old && (payment.kind === "refund" || payment.kind === "recovery")) {
        const row = calculateFinanceLedger(ledger).participants.find(
          (p) => p.id === payment.referenceId,
        );
        if (row?.remaining === null || row?.remaining === undefined)
          throw new Error("未配分の明細を解消してください。");
        if (
          payment.amount >
          (payment.kind === "refund" ? row.remaining : -row.remaining)
        )
          throw new Error("今回の受け渡し額が最新の残額を超えています。");
      }
    }
    if (command.resource === "charges") {
      const charge = LedgerChargeSchema.parse(value);
      const old = ledger.charges.find((c) => c.id === charge.id);
      if (old?.isBase || charge.isBase)
        throw new Error("基本請求は参加者の請求編集画面から変更してください。");
      if (
        old &&
        ledger.payments.some(
          (p) => p.kind === "collection" && p.referenceId === old.id,
        ) &&
        (old.personId !== charge.personId ||
          old.categoryId !== charge.categoryId)
      )
        throw new Error("徴収済みの請求の対象者・区分は変更できません。");
      if (charge.usesBaseAmount) {
        const category = ledger.categories.find(
          (c) => c.id === charge.categoryId,
        );
        if (!category)
          throw new Error("基本参加費の精算区分が見つかりません。");
        charge.amount = category.baseAmount;
      }
      charge.confirmed = true;
      Object.assign(value, charge);
    }
    if (command.resource === "expenses") {
      ledger.payments = ledger.payments.filter(
        (p) => p.kind !== "expense" || p.referenceId !== value.id,
      );
    }
    // Resource schemas and whole-document validation constrain this heterogeneous assignment.
    (ledger[command.resource] as Array<{ id: string }>) = [
      ...ledger[command.resource].filter((v) => v.id !== value.id),
      value,
    ];
    if (command.resource === "categories") {
      for (const charge of ledger.charges)
        if (charge.categoryId === value.id && charge.usesBaseAmount)
          charge.amount = ledger.categories.find(
            (c) => c.id === value.id,
          )!.baseAmount;
    }
    if (command.resource !== "payments") ledger.inputRevision++;
  } else if (command.action === "remove") {
    if (
      command.resource === "charges" &&
      ledger.charges.find((c) => c.id === command.id)?.isBase
    )
      throw new Error(
        "基本請求は削除できません。対象者は参加回答・区分設定から変更し、免除は個別金額0で指定してください。",
      );
    if (command.resource === "categories") {
      if (ledger.categories.find((c) => c.id === command.id)?.questionId)
        throw new Error("参加可否質問に対応する区分は削除できません。");
      if (
        [
          ...ledger.charges.filter(
            (c) =>
              !c.isBase ||
              ledger.payments.some(
                (p) => p.kind === "collection" && p.referenceId === c.id,
              ),
          ),
          ...ledger.items,
          ...ledger.expenses,
          ...ledger.incomes,
        ].some((r) => r.categoryId === command.id)
      )
        throw new Error(
          "徴収記録・追加請求・費目・経費・収入が紐づいているため、この精算区分は削除できません。",
        );
      ledger.charges = ledger.charges.filter(
        (c) => !c.isBase || c.categoryId !== command.id,
      );
    }

    if (command.resource === "expenses") {
      ledger.payments = ledger.payments.filter(
        (p) => p.kind !== "expense" || p.referenceId !== command.id,
      );
    }
    if (command.resource === "incomes") {
      ledger.payments = ledger.payments.filter(
        (p) => p.kind !== "income" || p.referenceId !== command.id,
      );
    }
    if (command.resource === "payments") {
      const removedPayment = ledger.payments.find(
        (payment) => payment.id === command.id,
      );
      if (
        removedPayment &&
        (removedPayment.kind === "refund" || removedPayment.kind === "recovery")
      ) {
        const personId = removedPayment.referenceId;
        const hasSettlementPayment = ledger.payments.some(
          (payment) =>
            (payment.kind === "refund" || payment.kind === "recovery") &&
            payment.referenceId === personId &&
            payment.id !== command.id,
        );
        if (!hasSettlementPayment) {
          const person = ledger.people.find((row) => row.id === personId);
          if (person) person.settlementStarted = false;
        }
      }
    }
    if (!ledger[command.resource].some((v) => v.id === command.id))
      throw new Error("明細が見つかりません。");
    (ledger[command.resource] as Array<{ id: string }>) = ledger[
      command.resource
    ].filter((v) => v.id !== command.id);
    if (command.resource !== "payments") ledger.inputRevision++;
  } else if (command.action === "rounding") {
    ledger.roundingUnit = command.unit;
    ledger.inputRevision++;
  } else if (command.action === "startSettlement") {
    const person = ledger.people.find((p) => p.id === command.personId);
    if (!person) throw new Error("参加者が見つかりません。");
    if (calculateFinanceLedger(ledger).unallocated.length)
      throw new Error("未配分の明細を解消してください。");
    person.settlementStarted = true;
  } else if (command.action === "confirmCharges")
    ledger.charges = ledger.charges.map((c) => ({ ...c, confirmed: true }));
  else if (command.action === "refundPlanned") {
    const person = calculateFinanceLedger(ledger).participants.find(
      (p) => p.id === command.personId,
    );
    if (!person) throw new Error("参加者が見つかりません。");
    const shortcut = getPlannedRefund(person.remaining);
    if (!shortcut.eligible) throw new Error(shortcut.reason);
    const paymentId = `${command.requestId}:refund`;
    if (ledger.payments.some((p) => p.id === paymentId))
      throw new Error("返金の操作IDが重複しています。");
    ledger.payments.push({
      id: paymentId,
      kind: "refund",
      referenceId: person.id,
      amount: shortcut.amount,
      at,
      note: "予定額の一括返金",
      migrated: false,
    });
  } else if (command.action === "collectPlanned") {
    const person = ledger.people.find((p) => p.id === command.personId);
    if (!person) throw new Error("参加者が見つかりません。");
    const shortcut = getPlannedCollection(
      ledger,
      person.id,
      command.includeIndependent ?? false,
    );
    if (!shortcut.eligible) throw new Error(shortcut.reason);
    for (const [index, charge] of shortcut.outstanding.entries()) {
      const paymentId = `${command.requestId}:${index}`;
      if (ledger.payments.some((p) => p.id === paymentId))
        throw new Error("徴収の操作IDが重複しています。");
      ledger.payments.push({
        id: paymentId,
        kind: "collection",
        referenceId: charge.id,
        amount: charge.remaining,
        at,
        note:
          charge.categoryId === null
            ? "参加費と個別請求の一括徴収"
            : "参加費の一括徴収",
        migrated: false,
      });
    }
  } else if (command.action === "createCategoryCharges") {
    if (syncBasicCharges(ledger)) ledger.inputRevision++;
  } else {
    const calculation = calculateFinanceLedger(ledger);
    if (calculation.unallocated.length)
      throw new Error("未配分の経費・収入を解消してから確定してください。");
    ledger.snapshot = {
      at,
      actorId,
      inputRevision: ledger.inputRevision,
      migrated: false,
      targets: Object.fromEntries(
        calculation.participants.map((p) => [p.id, p.proposedTarget]),
      ),
    };
  }
  if (command.action === "put" && command.resource === "categories")
    syncBasicCharges(ledger);
  for (const person of ledger.people) {
    if (hasStartedSettlement(ledger, person.id))
      person.settlementStarted = true;
  }
  validateFinanceLedger(ledger);
  if (
    command.action === "put" &&
    (command.resource === "expenses" || command.resource === "incomes")
  ) {
    const row = ledgerResourceSchemas[command.resource].parse(command.value);
    if (
      !("kind" in row && row.kind === "independent") &&
      row.allocation.mode === "fixed" &&
      row.allocation.rows.reduce((sum, r) => sum + r.value, 0) !== row.amount
    )
      throw new Error("配分合計を明細の金額と一致させてください。");
  }
  if (command.action === "put" && command.payment) {
    const value = ledgerResourceSchemas[command.resource].parse(command.value);
    const kind =
      command.resource === "expenses"
        ? "expense"
        : command.resource === "incomes"
          ? "income"
          : null;
    if (
      !kind ||
      command.payment.kind !== kind ||
      command.payment.referenceId !== value.id
    )
      throw new Error("同時に記録する入出金の対象が一致しません。");
    if (input.payments.some((p) => p.id === command.payment!.id))
      throw new Error("同時登録の入出金IDが重複しています。");
    return applyLedgerCommand(
      ledger,
      {
        ...command,
        resource: "payments",
        value: command.payment,
        payment: undefined,
      },
      actorId,
      at,
    );
  }
  return ledger;
}

export type LedgerPage = {
  active: boolean;
  revision: number;
  fingerprint: string | null;
  questions?: Array<{ id: string; label: string; personIds: string[] }>;
  access: {
    owner: boolean;
    permissions: import("../../schema").StaffPermissions;
  };
  state: FinanceLedger;
  calculation: Omit<
    LedgerCalculation,
    | "cash"
    | "independentCash"
    | "expenseOutstanding"
    | "incomeOutstanding"
    | "projected"
  > & {
    cash: number | null;
    independentCash: number | null;
    expenseOutstanding: number | null;
    incomeOutstanding: number | null;
    projected: number | null;
  };
};
