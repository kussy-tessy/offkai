CREATE TABLE "SettlementEntry" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementEntryRecipient" (
    "entryId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "SettlementEntryRecipient_pkey" PRIMARY KEY ("entryId", "answerId")
);

CREATE INDEX "SettlementEntry_groupId_createdAt_idx" ON "SettlementEntry"("groupId", "createdAt");
CREATE INDEX "SettlementEntryRecipient_answerId_idx" ON "SettlementEntryRecipient"("answerId");

ALTER TABLE "SettlementEntry" ADD CONSTRAINT "SettlementEntry_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "SettlementGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementEntryRecipient" ADD CONSTRAINT "SettlementEntryRecipient_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "SettlementEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementEntryRecipient" ADD CONSTRAINT "SettlementEntryRecipient_answerId_fkey"
    FOREIGN KEY ("answerId") REFERENCES "OffkaiAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SettlementEntry" ADD CONSTRAINT "SettlementEntry_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "SettlementEntryRecipient" ADD CONSTRAINT "SettlementEntryRecipient_amount_positive" CHECK ("amount" > 0);
