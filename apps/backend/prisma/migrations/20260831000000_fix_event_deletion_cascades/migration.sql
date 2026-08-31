ALTER TABLE "SettlementCategory"
DROP CONSTRAINT "SettlementCategory_commitmentQuestionId_fkey";

ALTER TABLE "SettlementCategoryMember"
DROP CONSTRAINT "SettlementCategoryMember_categoryId_fkey";

ALTER TABLE "SettlementExpense"
DROP CONSTRAINT "SettlementExpense_categoryId_fkey";

ALTER TABLE "SettlementIncome"
DROP CONSTRAINT "SettlementIncome_categoryId_fkey";

ALTER TABLE "SettlementCategory"
ADD CONSTRAINT "SettlementCategory_commitmentQuestionId_fkey"
FOREIGN KEY ("commitmentQuestionId") REFERENCES "CommitmentQuestion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SettlementCategoryMember"
ADD CONSTRAINT "SettlementCategoryMember_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "SettlementCategory"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SettlementExpense"
ADD CONSTRAINT "SettlementExpense_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "SettlementCategory"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SettlementIncome"
ADD CONSTRAINT "SettlementIncome_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "SettlementCategory"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
