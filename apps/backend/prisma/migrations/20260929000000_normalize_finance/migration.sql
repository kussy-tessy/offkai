-- The experimental JSON ledger is intentionally discarded (user-authorized).
-- Legacy Settlement*/ParticipantFinance data is retained for explicit migration.
DELETE FROM "FinanceLedgerHistory";
DELETE FROM "FinanceLedger";

-- AlterTable
ALTER TABLE "FinanceLedger" DROP COLUMN "state",
ADD COLUMN     "inputRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "roundingUnit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "snapshotActorId" TEXT,
ADD COLUMN     "snapshotAt" TIMESTAMP(3),
ADD COLUMN     "snapshotMigrated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snapshotRevision" INTEGER;

-- CreateTable
CREATE TABLE "FinancePerson" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,

    CONSTRAINT "FinancePerson_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "questionId" TEXT,
    "name" TEXT NOT NULL,
    "baseAmount" INTEGER NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceCategoryMember" (
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FinanceCategoryMember_pkey" PRIMARY KEY ("eventId","categoryId","personId")
);

-- CreateTable
CREATE TABLE "FinanceItem" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocationMode" TEXT NOT NULL,

    CONSTRAINT "FinanceItem_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceCharge" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "personId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "amountOverride" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinanceCharge_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceExpense" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "itemId" TEXT,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "allocationMode" TEXT NOT NULL,
    "payerId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinanceExpense_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceIncome" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "allocationMode" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinanceIncome_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceLoan" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinanceLoan_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceAdjustment" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "personId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinanceAdjustment_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinancePayment" (
    "eventId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL,
    "chargeId" TEXT,
    "personId" TEXT,
    "expenseId" TEXT,
    "incomeId" TEXT,
    "loanId" TEXT,
    "amount" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "migrated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinancePayment_pkey" PRIMARY KEY ("eventId","id")
);

-- CreateTable
CREATE TABLE "FinanceItemAllocation" (
    "eventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "value" DECIMAL(16,3) NOT NULL,

    CONSTRAINT "FinanceItemAllocation_pkey" PRIMARY KEY ("eventId","itemId","personId")
);

-- CreateTable
CREATE TABLE "FinanceExpenseAllocation" (
    "eventId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "value" DECIMAL(16,3) NOT NULL,

    CONSTRAINT "FinanceExpenseAllocation_pkey" PRIMARY KEY ("eventId","expenseId","personId")
);

-- CreateTable
CREATE TABLE "FinanceIncomeAllocation" (
    "eventId" TEXT NOT NULL,
    "incomeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "value" DECIMAL(16,3) NOT NULL,

    CONSTRAINT "FinanceIncomeAllocation_pkey" PRIMARY KEY ("eventId","incomeId","personId")
);

-- CreateTable
CREATE TABLE "FinanceExpenseRecipient" (
    "eventId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "FinanceExpenseRecipient_pkey" PRIMARY KEY ("eventId","expenseId","personId")
);

-- CreateTable
CREATE TABLE "FinanceSettlementTarget" (
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "FinanceSettlementTarget_pkey" PRIMARY KEY ("eventId","personId")
);

-- CreateTable
CREATE TABLE "FinanceMigrationNote" (
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "FinanceMigrationNote_pkey" PRIMARY KEY ("eventId","position")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_eventId_questionId_key" ON "FinanceCategory"("eventId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAdjustment_eventId_personId_key" ON "FinanceAdjustment"("eventId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "CommitmentQuestion_eventId_id_key" ON "CommitmentQuestion"("eventId", "id");

-- AddForeignKey
ALTER TABLE "FinancePerson" ADD CONSTRAINT "FinancePerson_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_eventId_questionId_fkey" FOREIGN KEY ("eventId", "questionId") REFERENCES "CommitmentQuestion"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCategoryMember" ADD CONSTRAINT "FinanceCategoryMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCategoryMember" ADD CONSTRAINT "FinanceCategoryMember_eventId_categoryId_fkey" FOREIGN KEY ("eventId", "categoryId") REFERENCES "FinanceCategory"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCategoryMember" ADD CONSTRAINT "FinanceCategoryMember_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_eventId_categoryId_fkey" FOREIGN KEY ("eventId", "categoryId") REFERENCES "FinanceCategory"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_eventId_categoryId_fkey" FOREIGN KEY ("eventId", "categoryId") REFERENCES "FinanceCategory"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_eventId_categoryId_fkey" FOREIGN KEY ("eventId", "categoryId") REFERENCES "FinanceCategory"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_eventId_itemId_fkey" FOREIGN KEY ("eventId", "itemId") REFERENCES "FinanceItem"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_eventId_payerId_fkey" FOREIGN KEY ("eventId", "payerId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceIncome" ADD CONSTRAINT "FinanceIncome_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceIncome" ADD CONSTRAINT "FinanceIncome_eventId_categoryId_fkey" FOREIGN KEY ("eventId", "categoryId") REFERENCES "FinanceCategory"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceLoan" ADD CONSTRAINT "FinanceLoan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceLoan" ADD CONSTRAINT "FinanceLoan_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceAdjustment" ADD CONSTRAINT "FinanceAdjustment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceAdjustment" ADD CONSTRAINT "FinanceAdjustment_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_eventId_chargeId_fkey" FOREIGN KEY ("eventId", "chargeId") REFERENCES "FinanceCharge"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_eventId_expenseId_fkey" FOREIGN KEY ("eventId", "expenseId") REFERENCES "FinanceExpense"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_eventId_incomeId_fkey" FOREIGN KEY ("eventId", "incomeId") REFERENCES "FinanceIncome"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_eventId_loanId_fkey" FOREIGN KEY ("eventId", "loanId") REFERENCES "FinanceLoan"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceItemAllocation" ADD CONSTRAINT "FinanceItemAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceItemAllocation" ADD CONSTRAINT "FinanceItemAllocation_eventId_itemId_fkey" FOREIGN KEY ("eventId", "itemId") REFERENCES "FinanceItem"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceItemAllocation" ADD CONSTRAINT "FinanceItemAllocation_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpenseAllocation" ADD CONSTRAINT "FinanceExpenseAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpenseAllocation" ADD CONSTRAINT "FinanceExpenseAllocation_eventId_expenseId_fkey" FOREIGN KEY ("eventId", "expenseId") REFERENCES "FinanceExpense"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpenseAllocation" ADD CONSTRAINT "FinanceExpenseAllocation_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceIncomeAllocation" ADD CONSTRAINT "FinanceIncomeAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceIncomeAllocation" ADD CONSTRAINT "FinanceIncomeAllocation_eventId_incomeId_fkey" FOREIGN KEY ("eventId", "incomeId") REFERENCES "FinanceIncome"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceIncomeAllocation" ADD CONSTRAINT "FinanceIncomeAllocation_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpenseRecipient" ADD CONSTRAINT "FinanceExpenseRecipient_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpenseRecipient" ADD CONSTRAINT "FinanceExpenseRecipient_eventId_expenseId_fkey" FOREIGN KEY ("eventId", "expenseId") REFERENCES "FinanceExpense"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceExpenseRecipient" ADD CONSTRAINT "FinanceExpenseRecipient_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceSettlementTarget" ADD CONSTRAINT "FinanceSettlementTarget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceSettlementTarget" ADD CONSTRAINT "FinanceSettlementTarget_eventId_personId_fkey" FOREIGN KEY ("eventId", "personId") REFERENCES "FinancePerson"("eventId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceMigrationNote" ADD CONSTRAINT "FinanceMigrationNote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "FinanceLedger" ADD CONSTRAINT "FinanceLedger_roundingUnit_check" CHECK ("roundingUnit" IN (1,10,100,500));

ALTER TABLE "FinanceLedger" ADD CONSTRAINT "FinanceLedger_snapshot_check" CHECK (("snapshotAt" IS NULL AND "snapshotActorId" IS NULL AND "snapshotRevision" IS NULL) OR ("snapshotAt" IS NOT NULL AND "snapshotActorId" IS NOT NULL AND "snapshotRevision" IS NOT NULL));

ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_amount_check" CHECK (("amountOverride" IS NOT NULL AND "amountOverride" BETWEEN 0 AND 1000000000) OR ("amountOverride" IS NULL AND "categoryId" IS NOT NULL));

ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_amount_check" CHECK ("baseAmount" BETWEEN 0 AND 1000000000);

ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_kind_check" CHECK (("kind" IN ('expense','cooperation') AND "categoryId" IS NOT NULL) OR ("kind" = 'independent' AND "categoryId" IS NULL AND "itemId" IS NULL AND "payerId" IS NULL));

ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_payer_check" CHECK ("payerId" IS NULL OR "kind" = 'expense');

ALTER TABLE "FinanceAdjustment" ADD CONSTRAINT "FinanceAdjustment_mode_check" CHECK ("mode" IN ('delta','fixed'));

ALTER TABLE "FinanceAdjustment" ADD CONSTRAINT "FinanceAdjustment_amount_check" CHECK ("amount" BETWEEN -1000000000 AND 1000000000);

ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_reference_check" CHECK (num_nonnulls("chargeId","personId","expenseId","incomeId","loanId") = 1 AND (
   ("kind" = 'collection' AND "chargeId" IS NOT NULL) OR
   ("kind" IN ('refund','recovery') AND "personId" IS NOT NULL) OR
   ("kind" = 'expense' AND "expenseId" IS NOT NULL) OR
   ("kind" = 'income' AND "incomeId" IS NOT NULL) OR
   ("kind" IN ('loanIn','loanOut') AND "loanId" IS NOT NULL)));
ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_amount_check" CHECK ("amount" BETWEEN 0 AND 1000000000);
ALTER TABLE "FinanceIncome" ADD CONSTRAINT "FinanceIncome_amount_check" CHECK ("amount" BETWEEN 0 AND 1000000000);
ALTER TABLE "FinanceLoan" ADD CONSTRAINT "FinanceLoan_amount_check" CHECK ("amount" BETWEEN 0 AND 1000000000);
ALTER TABLE "FinanceExpenseRecipient" ADD CONSTRAINT "FinanceExpenseRecipient_amount_check" CHECK ("amount" BETWEEN 0 AND 1000000000);
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_amount_check" CHECK ("amount" BETWEEN 1 AND 1000000000);
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_allocation_mode_check" CHECK ("allocationMode" IN ('weights','fixed'));
ALTER TABLE "FinanceItemAllocation" ADD CONSTRAINT "FinanceItemAllocation_value_check" CHECK ("value" BETWEEN 0 AND 1000000000);
ALTER TABLE "FinanceExpense" ADD CONSTRAINT "FinanceExpense_allocation_mode_check" CHECK ("allocationMode" IN ('weights','fixed'));
ALTER TABLE "FinanceExpenseAllocation" ADD CONSTRAINT "FinanceExpenseAllocation_value_check" CHECK ("value" BETWEEN 0 AND 1000000000);
ALTER TABLE "FinanceIncome" ADD CONSTRAINT "FinanceIncome_allocation_mode_check" CHECK ("allocationMode" IN ('weights','fixed'));
ALTER TABLE "FinanceIncomeAllocation" ADD CONSTRAINT "FinanceIncomeAllocation_value_check" CHECK ("value" BETWEEN 0 AND 1000000000);
