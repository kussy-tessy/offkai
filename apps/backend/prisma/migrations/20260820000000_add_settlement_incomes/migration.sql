CREATE TABLE "SettlementIncome" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementIncome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SettlementIncome_groupId_createdAt_idx" ON "SettlementIncome"("groupId", "createdAt");

ALTER TABLE "SettlementIncome" ADD CONSTRAINT "SettlementIncome_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "SettlementGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SettlementIncome" ADD CONSTRAINT "SettlementIncome_amount_positive" CHECK ("amount" > 0);
