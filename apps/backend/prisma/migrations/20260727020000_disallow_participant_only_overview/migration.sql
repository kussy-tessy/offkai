-- Normalize values that were allowed before this constraint was introduced.
UPDATE "OffkaiEvent"
SET "overviewVisibility" = 'AUTHENTICATED'
WHERE "overviewVisibility" = 'PARTICIPANTS';

-- AddCheckConstraint
ALTER TABLE "OffkaiEvent"
ADD CONSTRAINT "OffkaiEvent_overviewVisibility_not_participants_check"
CHECK ("overviewVisibility" <> 'PARTICIPANTS');
