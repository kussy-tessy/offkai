CREATE TABLE "FinanceLedger" (
 "eventId" TEXT NOT NULL PRIMARY KEY,
 "revision" INTEGER NOT NULL DEFAULT 0,
 "state" JSONB NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FinanceLedger_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OffkaiEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FinanceLedgerHistory" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL,
 "revision" INTEGER NOT NULL,
 "requestId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "resource" TEXT NOT NULL,
 "state" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FinanceLedgerHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FinanceLedger"("eventId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinanceLedgerHistory_eventId_revision_key" ON "FinanceLedgerHistory"("eventId", "revision");
CREATE UNIQUE INDEX "FinanceLedgerHistory_eventId_requestId_key" ON "FinanceLedgerHistory"("eventId", "requestId");
