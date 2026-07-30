-- AddCheckConstraint
ALTER TABLE "OffkaiEvent"
ADD CONSTRAINT "OffkaiEvent_participantsVisibility_not_broader_check"
CHECK (
    CASE "participantsVisibility"
        WHEN 'PUBLIC' THEN 0
        WHEN 'AUTHENTICATED' THEN 1
        WHEN 'GUILD_MEMBERS' THEN 2
        WHEN 'PARTICIPANTS' THEN 3
    END
    >=
    CASE "overviewVisibility"
        WHEN 'PUBLIC' THEN 0
        WHEN 'AUTHENTICATED' THEN 1
        WHEN 'GUILD_MEMBERS' THEN 2
        WHEN 'PARTICIPANTS' THEN 3
    END
);
