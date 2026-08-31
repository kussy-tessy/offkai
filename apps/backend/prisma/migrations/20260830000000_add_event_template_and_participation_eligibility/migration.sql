CREATE TYPE "ParticipationEligibility" AS ENUM ('AUTHENTICATED', 'GUILD_MEMBERS');

ALTER TABLE "Series"
ADD COLUMN "templateAskBringingKigurumi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "templateOverviewVisibility" "EventVisibility" NOT NULL DEFAULT 'AUTHENTICATED',
ADD COLUMN "templateParticipantsVisibility" "EventVisibility" NOT NULL DEFAULT 'AUTHENTICATED',
ADD COLUMN "templateParticipationEligibility" "ParticipationEligibility" NOT NULL DEFAULT 'AUTHENTICATED';

ALTER TABLE "OffkaiEvent"
ADD COLUMN "participationEligibility" "ParticipationEligibility" NOT NULL DEFAULT 'AUTHENTICATED';

ALTER TABLE "Series"
ADD CONSTRAINT "Series_templateOverviewVisibility_not_participants_check"
CHECK ("templateOverviewVisibility" <> 'PARTICIPANTS'),
ADD CONSTRAINT "Series_templateParticipantsVisibility_not_broader_check"
CHECK (
  CASE "templateParticipantsVisibility"
    WHEN 'PUBLIC' THEN 0
    WHEN 'AUTHENTICATED' THEN 1
    WHEN 'GUILD_MEMBERS' THEN 2
    WHEN 'PARTICIPANTS' THEN 3
  END >=
  CASE "templateOverviewVisibility"
    WHEN 'PUBLIC' THEN 0
    WHEN 'AUTHENTICATED' THEN 1
    WHEN 'GUILD_MEMBERS' THEN 2
    WHEN 'PARTICIPANTS' THEN 3
  END
);
