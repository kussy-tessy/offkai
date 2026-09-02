ALTER TABLE "ParticipantFinance"
ADD COLUMN "collectionNote" TEXT,
ADD COLUMN "settlementNote" TEXT,
ADD COLUMN "refundNote" TEXT,
ADD COLUMN "collectedByUserId" TEXT,
ADD COLUMN "refundedByUserId" TEXT;

CREATE INDEX "ParticipantFinance_collectedByUserId_idx" ON "ParticipantFinance"("collectedByUserId");
CREATE INDEX "ParticipantFinance_refundedByUserId_idx" ON "ParticipantFinance"("refundedByUserId");

ALTER TABLE "ParticipantFinance"
ADD CONSTRAINT "ParticipantFinance_collectedByUserId_fkey"
FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParticipantFinance"
ADD CONSTRAINT "ParticipantFinance_refundedByUserId_fkey"
FOREIGN KEY ("refundedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
