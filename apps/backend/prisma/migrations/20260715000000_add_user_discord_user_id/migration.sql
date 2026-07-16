ALTER TABLE "User" ADD COLUMN "discordUserId" TEXT;
CREATE UNIQUE INDEX "User_discordUserId_key" ON "User"("discordUserId");
