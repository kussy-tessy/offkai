CREATE TABLE "PasswordCredential" (
    "userId" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "DiscordIdentity" (
    "userId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordIdentity_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "PasswordCredential_loginId_key" ON "PasswordCredential"("loginId");
CREATE UNIQUE INDEX "DiscordIdentity_discordUserId_key" ON "DiscordIdentity"("discordUserId");

ALTER TABLE "PasswordCredential" ADD CONSTRAINT "PasswordCredential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscordIdentity" ADD CONSTRAINT "DiscordIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PasswordCredential" ("userId", "loginId", "passwordHash", "createdAt", "updatedAt")
SELECT "id", "loginId", "passwordHash", "createdAt", "updatedAt" FROM "User";

INSERT INTO "DiscordIdentity" ("userId", "discordUserId", "username", "createdAt", "updatedAt")
SELECT "id", "discordUserId", COALESCE("discordUsername", "discordUserId"), "createdAt", "updatedAt"
FROM "User"
WHERE "discordUserId" IS NOT NULL;

DROP INDEX "User_loginId_key";
DROP INDEX IF EXISTS "User_discordUsername_key";
DROP INDEX "User_discordUserId_key";
ALTER TABLE "User" DROP COLUMN "loginId",
                   DROP COLUMN "passwordHash",
                   DROP COLUMN "discordUsername",
                   DROP COLUMN "discordUserId";
