-- CreateTable
CREATE TABLE "OffkaiPhotoShare" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "downloadDeadline" TEXT,
    "password" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffkaiPhotoShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoDownloadStatus" (
    "photoShareId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoDownloadStatus_pkey" PRIMARY KEY ("photoShareId", "userId")
);

-- CreateIndex
CREATE INDEX "OffkaiPhotoShare_eventId_createdAt_idx" ON "OffkaiPhotoShare"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "OffkaiPhotoShare" ADD CONSTRAINT "OffkaiPhotoShare_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OffkaiEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffkaiPhotoShare" ADD CONSTRAINT "OffkaiPhotoShare_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoDownloadStatus" ADD CONSTRAINT "PhotoDownloadStatus_photoShareId_fkey" FOREIGN KEY ("photoShareId") REFERENCES "OffkaiPhotoShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoDownloadStatus" ADD CONSTRAINT "PhotoDownloadStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
