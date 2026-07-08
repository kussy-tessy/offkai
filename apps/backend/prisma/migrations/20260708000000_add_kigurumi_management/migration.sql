ALTER TABLE "OffkaiEvent"
ADD COLUMN "askBringingKigurumi" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OffkaiAnswer"
ADD COLUMN "bringingKigurumis" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "OffkaiAnswerHistory"
ADD COLUMN "bringingKigurumis" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "Kigurumi" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kigurumi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Kigurumi_ownerUserId_createdAt_idx" ON "Kigurumi"("ownerUserId", "createdAt");

ALTER TABLE "Kigurumi"
ADD CONSTRAINT "Kigurumi_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
