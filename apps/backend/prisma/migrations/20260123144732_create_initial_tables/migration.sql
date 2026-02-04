-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "OffkaiSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffkaiSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesMember" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeriesMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffkaiEvent" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "applicationStartDate" TIMESTAMP(3) NOT NULL,
    "commitmentQuestions" JSONB NOT NULL,
    "preferenceQuestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffkaiEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffkaiAnswer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commitmentAnswers" JSONB NOT NULL,
    "preferenceAnswers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffkaiAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffkaiAnswerHistory" (
    "id" TEXT NOT NULL,
    "offkaiAnswerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commitmentAnswers" JSONB NOT NULL,
    "preferenceAnswers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffkaiAnswerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeriesMember_seriesId_userId_key" ON "SeriesMember"("seriesId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OffkaiAnswer_eventId_userId_key" ON "OffkaiAnswer"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "SeriesMember" ADD CONSTRAINT "SeriesMember_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "OffkaiSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesMember" ADD CONSTRAINT "SeriesMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffkaiEvent" ADD CONSTRAINT "OffkaiEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "OffkaiSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffkaiAnswer" ADD CONSTRAINT "OffkaiAnswer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OffkaiEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffkaiAnswer" ADD CONSTRAINT "OffkaiAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffkaiAnswerHistory" ADD CONSTRAINT "OffkaiAnswerHistory_offkaiAnswerId_fkey" FOREIGN KEY ("offkaiAnswerId") REFERENCES "OffkaiAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
