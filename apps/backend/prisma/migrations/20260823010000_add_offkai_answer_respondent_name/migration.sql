ALTER TABLE "OffkaiAnswer"
ADD COLUMN "respondentName" TEXT;

UPDATE "OffkaiAnswer" AS answer
SET "respondentName" = "User"."name"
FROM "User"
WHERE answer."userId" = "User"."id";

ALTER TABLE "OffkaiAnswer"
ALTER COLUMN "respondentName" SET NOT NULL;
