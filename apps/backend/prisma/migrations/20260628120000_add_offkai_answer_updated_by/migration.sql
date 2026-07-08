ALTER TABLE "OffkaiAnswer"
  ADD COLUMN "updatedBy" TEXT;

UPDATE "OffkaiAnswer"
SET "updatedBy" = "userId";

ALTER TABLE "OffkaiAnswer"
  ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "OffkaiAnswer"
  ADD CONSTRAINT "OffkaiAnswer_updatedBy_fkey"
  FOREIGN KEY ("updatedBy") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
