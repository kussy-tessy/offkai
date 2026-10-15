CREATE TABLE "KigurumiImage" (
  "kigurumiId" TEXT NOT NULL PRIMARY KEY REFERENCES "Kigurumi"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "objectKey" TEXT NOT NULL UNIQUE,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL
);
CREATE TRIGGER kigurumi_image_deletion AFTER DELETE ON "KigurumiImage"
FOR EACH ROW EXECUTE FUNCTION queue_guide_image_deletion();
CREATE TRIGGER kigurumi_image_replacement AFTER UPDATE OF "objectKey" ON "KigurumiImage"
FOR EACH ROW WHEN (OLD."objectKey" IS DISTINCT FROM NEW."objectKey") EXECUTE FUNCTION queue_guide_image_deletion();
