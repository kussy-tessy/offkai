ALTER TABLE "User" ADD COLUMN "discordUsername" TEXT;

CREATE UNIQUE INDEX "User_discordUsername_key" ON "User"("discordUsername");
