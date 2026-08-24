ALTER TABLE "SettlementGroup" RENAME TO "SettlementCategory";
ALTER TABLE "SettlementGroupMember" RENAME TO "SettlementCategoryMember";
ALTER TABLE "SettlementEntry" RENAME TO "SettlementExpense";
ALTER TABLE "SettlementEntryRecipient" RENAME TO "SettlementExpenseRecipient";

ALTER TABLE "SettlementCategory" RENAME COLUMN "feeAmount" TO "baseParticipationFeeAmount";
ALTER TABLE "SettlementCategoryMember" RENAME COLUMN "groupId" TO "categoryId";
ALTER TABLE "SettlementExpense" RENAME COLUMN "groupId" TO "categoryId";
ALTER TABLE "SettlementExpenseRecipient" RENAME COLUMN "entryId" TO "expenseId";
ALTER TABLE "SettlementIncome" RENAME COLUMN "groupId" TO "categoryId";

ALTER TABLE "SettlementCategory" RENAME CONSTRAINT "SettlementGroup_pkey" TO "SettlementCategory_pkey";
ALTER TABLE "SettlementCategory" RENAME CONSTRAINT "SettlementGroup_eventId_fkey" TO "SettlementCategory_eventId_fkey";
ALTER TABLE "SettlementCategory" RENAME CONSTRAINT "SettlementGroup_commitmentQuestionId_fkey" TO "SettlementCategory_commitmentQuestionId_fkey";
ALTER TABLE "SettlementCategory" RENAME CONSTRAINT "SettlementGroup_feeAmount_nonnegative" TO "SettlementCategory_baseParticipationFeeAmount_nonnegative";
ALTER INDEX "SettlementGroup_eventId_name_key" RENAME TO "SettlementCategory_eventId_name_key";
ALTER INDEX "SettlementGroup_commitmentQuestionId_idx" RENAME TO "SettlementCategory_commitmentQuestionId_idx";

ALTER TABLE "SettlementCategoryMember" RENAME CONSTRAINT "SettlementGroupMember_pkey" TO "SettlementCategoryMember_pkey";
ALTER TABLE "SettlementCategoryMember" RENAME CONSTRAINT "SettlementGroupMember_groupId_fkey" TO "SettlementCategoryMember_categoryId_fkey";
ALTER TABLE "SettlementCategoryMember" RENAME CONSTRAINT "SettlementGroupMember_answerId_fkey" TO "SettlementCategoryMember_answerId_fkey";
ALTER TABLE "SettlementCategoryMember" RENAME CONSTRAINT "SettlementGroupMember_amountOverride_nonnegative" TO "SettlementCategoryMember_amountOverride_nonnegative";
ALTER INDEX "SettlementGroupMember_answerId_idx" RENAME TO "SettlementCategoryMember_answerId_idx";

ALTER TABLE "SettlementExpense" RENAME CONSTRAINT "SettlementEntry_pkey" TO "SettlementExpense_pkey";
ALTER TABLE "SettlementExpense" RENAME CONSTRAINT "SettlementEntry_groupId_fkey" TO "SettlementExpense_categoryId_fkey";
ALTER TABLE "SettlementExpense" RENAME CONSTRAINT "SettlementEntry_amount_positive" TO "SettlementExpense_amount_positive";
ALTER INDEX "SettlementEntry_groupId_createdAt_idx" RENAME TO "SettlementExpense_categoryId_createdAt_idx";

ALTER TABLE "SettlementExpenseRecipient" RENAME CONSTRAINT "SettlementEntryRecipient_pkey" TO "SettlementExpenseRecipient_pkey";
ALTER TABLE "SettlementExpenseRecipient" RENAME CONSTRAINT "SettlementEntryRecipient_entryId_fkey" TO "SettlementExpenseRecipient_expenseId_fkey";
ALTER TABLE "SettlementExpenseRecipient" RENAME CONSTRAINT "SettlementEntryRecipient_answerId_fkey" TO "SettlementExpenseRecipient_answerId_fkey";
ALTER TABLE "SettlementExpenseRecipient" RENAME CONSTRAINT "SettlementEntryRecipient_amount_positive" TO "SettlementExpenseRecipient_amount_positive";
ALTER INDEX "SettlementEntryRecipient_answerId_idx" RENAME TO "SettlementExpenseRecipient_answerId_idx";

ALTER TABLE "SettlementIncome" RENAME CONSTRAINT "SettlementIncome_groupId_fkey" TO "SettlementIncome_categoryId_fkey";
ALTER INDEX "SettlementIncome_groupId_createdAt_idx" RENAME TO "SettlementIncome_categoryId_createdAt_idx";
