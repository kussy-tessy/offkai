-- Event deletion cascades through both CommitmentQuestion and FinanceLedger.
-- Check this cross-branch FK after both cascades finish, rather than midway
-- through a referential-action trigger. A standalone question deletion with a
-- financial category still fails at commit; financial rows are never cascaded
-- from a question deletion.
ALTER TABLE "FinanceCategory"
  ALTER CONSTRAINT "FinanceCategory_eventId_questionId_fkey"
  DEFERRABLE INITIALLY DEFERRED;
