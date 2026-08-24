ALTER TABLE "OffkaiAnswer"
DROP CONSTRAINT "OffkaiAnswer_userId_fkey";

ALTER TABLE "OffkaiAnswer"
ADD CONSTRAINT "OffkaiAnswer_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
