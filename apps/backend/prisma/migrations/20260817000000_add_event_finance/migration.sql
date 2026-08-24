CREATE TYPE "RefundRoundingUnit" AS ENUM ('TEN', 'HUNDRED', 'FIVE_HUNDRED');

CREATE TABLE "EventFinance" (
    "eventId" TEXT NOT NULL,
    "refundRoundingUnit" "RefundRoundingUnit" NOT NULL DEFAULT 'TEN',
    "refundLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventFinance_pkey" PRIMARY KEY ("eventId")
);

CREATE TABLE "SettlementGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "commitmentQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementGroupMember" (
    "groupId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "amountOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementGroupMember_pkey" PRIMARY KEY ("groupId", "answerId")
);

CREATE TABLE "ParticipantFinance" (
    "answerId" TEXT NOT NULL,
    "chargeAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "collectedAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "refundCalculatedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantFinance_pkey" PRIMARY KEY ("answerId")
);

CREATE TABLE "ParticipantExtraCharge" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantExtraCharge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SettlementGroup_eventId_name_key" ON "SettlementGroup"("eventId", "name");
CREATE INDEX "SettlementGroup_commitmentQuestionId_idx" ON "SettlementGroup"("commitmentQuestionId");
CREATE INDEX "SettlementGroupMember_answerId_idx" ON "SettlementGroupMember"("answerId");
CREATE INDEX "ParticipantExtraCharge_answerId_idx" ON "ParticipantExtraCharge"("answerId");

ALTER TABLE "EventFinance" ADD CONSTRAINT "EventFinance_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "OffkaiEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementGroup" ADD CONSTRAINT "SettlementGroup_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "EventFinance"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementGroup" ADD CONSTRAINT "SettlementGroup_commitmentQuestionId_fkey"
    FOREIGN KEY ("commitmentQuestionId") REFERENCES "CommitmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementGroupMember" ADD CONSTRAINT "SettlementGroupMember_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "SettlementGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementGroupMember" ADD CONSTRAINT "SettlementGroupMember_answerId_fkey"
    FOREIGN KEY ("answerId") REFERENCES "OffkaiAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantFinance" ADD CONSTRAINT "ParticipantFinance_answerId_fkey"
    FOREIGN KEY ("answerId") REFERENCES "OffkaiAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantExtraCharge" ADD CONSTRAINT "ParticipantExtraCharge_answerId_fkey"
    FOREIGN KEY ("answerId") REFERENCES "ParticipantFinance"("answerId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SettlementGroup" ADD CONSTRAINT "SettlementGroup_feeAmount_nonnegative" CHECK ("feeAmount" >= 0);
ALTER TABLE "SettlementGroupMember" ADD CONSTRAINT "SettlementGroupMember_amountOverride_nonnegative" CHECK ("amountOverride" IS NULL OR "amountOverride" >= 0);
ALTER TABLE "ParticipantFinance" ADD CONSTRAINT "ParticipantFinance_chargeAmount_nonnegative" CHECK ("chargeAmount" >= 0);
ALTER TABLE "ParticipantFinance" ADD CONSTRAINT "ParticipantFinance_refundAmount_nonnegative" CHECK ("refundAmount" IS NULL OR "refundAmount" >= 0);
ALTER TABLE "ParticipantExtraCharge" ADD CONSTRAINT "ParticipantExtraCharge_amount_nonnegative" CHECK ("amount" >= 0);
