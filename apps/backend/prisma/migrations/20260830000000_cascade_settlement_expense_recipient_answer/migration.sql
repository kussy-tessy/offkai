ALTER TABLE "SettlementExpenseRecipient"
DROP CONSTRAINT "SettlementExpenseRecipient_answerId_fkey";

ALTER TABLE "SettlementExpenseRecipient"
ADD CONSTRAINT "SettlementExpenseRecipient_answerId_fkey"
FOREIGN KEY ("answerId") REFERENCES "OffkaiAnswer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
