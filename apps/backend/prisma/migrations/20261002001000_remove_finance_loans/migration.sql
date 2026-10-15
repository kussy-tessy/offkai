ALTER TABLE "FinancePayment" DROP CONSTRAINT "FinancePayment_reference_check";
DELETE FROM "FinancePayment" WHERE "loanId" IS NOT NULL;
ALTER TABLE "FinancePayment" DROP COLUMN "loanId";
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_reference_check" CHECK (num_nonnulls("chargeId","personId","expenseId","incomeId") = 1 AND (
   ("kind" = 'collection' AND "chargeId" IS NOT NULL) OR
   ("kind" IN ('refund','recovery') AND "personId" IS NOT NULL) OR
   ("kind" = 'expense' AND "expenseId" IS NOT NULL) OR
   ("kind" = 'income' AND "incomeId" IS NOT NULL)));
DROP TABLE "FinanceLoan";
