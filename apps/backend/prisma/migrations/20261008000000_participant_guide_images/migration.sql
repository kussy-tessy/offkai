CREATE TABLE "ParticipantGuideImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "OffkaiEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "uploaderUserId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL UNIQUE,
  "sha256" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ParticipantGuideImage_eventId_createdAt_idx" ON "ParticipantGuideImage"("eventId", "createdAt");
CREATE TABLE "R2PendingDeletion" (
  "objectKey" TEXT NOT NULL PRIMARY KEY,
  "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE FUNCTION queue_guide_image_deletion() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "R2PendingDeletion" ("objectKey") VALUES (OLD."objectKey") ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER guide_image_deletion AFTER DELETE ON "ParticipantGuideImage"
FOR EACH ROW EXECUTE FUNCTION queue_guide_image_deletion();
