-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM (
    'PUBLIC',
    'AUTHENTICATED',
    'GUILD_MEMBERS',
    'PARTICIPANTS'
);

-- AlterTable
ALTER TABLE "OffkaiEvent"
ADD COLUMN "overviewVisibility" "EventVisibility" NOT NULL DEFAULT 'AUTHENTICATED',
ADD COLUMN "participantsVisibility" "EventVisibility" NOT NULL DEFAULT 'AUTHENTICATED';
