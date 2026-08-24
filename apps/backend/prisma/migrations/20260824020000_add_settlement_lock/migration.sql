ALTER TABLE "EventFinance"
RENAME COLUMN "refundLockedAt" TO "refundStartedAt";

ALTER TABLE "EventFinance"
ADD COLUMN "settlementLockedAt" TIMESTAMP(3);

UPDATE "EventFinance"
SET "settlementLockedAt" = "refundStartedAt"
WHERE "refundStartedAt" IS NOT NULL;
