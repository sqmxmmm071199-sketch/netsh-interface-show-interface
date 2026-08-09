-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "fileName" TEXT,
ADD COLUMN "fileType" TEXT,
ADD COLUMN "fileUrl" TEXT,
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "usageStatus" "AssetStatus" NOT NULL DEFAULT 'UNUSED',
ADD COLUMN "aiDescription" TEXT,
ADD COLUMN "productName" TEXT,
ADD COLUMN "scene" TEXT,
ADD COLUMN "suggestedUse" TEXT,
ADD COLUMN "recommendedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill existing mock assets into the upload-oriented fields.
UPDATE "Asset"
SET
  "fileName" = COALESCE("fileName", "title"),
  "fileType" = COALESCE("fileType", "mimeType"),
  "fileUrl" = COALESCE("fileUrl", "url"),
  "usageStatus" = "status",
  "aiDescription" = COALESCE("aiDescription", "description")
WHERE "fileName" IS NULL
   OR "fileUrl" IS NULL
   OR "aiDescription" IS NULL;

-- CreateIndex
CREATE INDEX "Asset_usageStatus_idx" ON "Asset"("usageStatus");
