ALTER TABLE "OffkaiEvent"
  ADD COLUMN "eventStartDate" DATE,
  ADD COLUMN "eventEndDate" DATE;

UPDATE "OffkaiEvent"
SET
  "eventStartDate" = "eventDate"::date,
  "eventEndDate" = "eventDate"::date;

ALTER TABLE "OffkaiEvent"
  ALTER COLUMN "eventStartDate" SET NOT NULL,
  ALTER COLUMN "eventEndDate" SET NOT NULL,
  DROP COLUMN "eventDate";
