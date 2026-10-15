CREATE TABLE "FinanceExpenseImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "uploaderUserId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL UNIQUE,
  "sha256" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceExpenseImage_eventId_expenseId_fkey"
    FOREIGN KEY ("eventId", "expenseId")
    REFERENCES "FinanceExpense"("eventId", "id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "FinanceExpenseImage_eventId_expenseId_createdAt_idx"
  ON "FinanceExpenseImage"("eventId", "expenseId", "createdAt");
CREATE TRIGGER finance_expense_image_deletion AFTER DELETE ON "FinanceExpenseImage"
FOR EACH ROW EXECUTE FUNCTION queue_guide_image_deletion();
