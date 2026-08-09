-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'PINTEREST', 'LINKEDIN', 'XIAOHONGSHU');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'LINK', 'TEXT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UNUSED', 'USED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'CAROUSEL', 'SHORT_VIDEO_SCRIPT', 'STORY', 'AD_COPY');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('PREFERENCE', 'BRAND_RULE', 'PLATFORM_INSIGHT', 'CONTENT_RULE', 'COMPLIANCE_RULE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "storeUrl" TEXT,
    "industry" TEXT,
    "productDescription" TEXT,
    "targetAudience" TEXT,
    "brandTone" TEXT,
    "brandKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagline" TEXT,
    "description" TEXT,
    "toneKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudiences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitorLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platformPreferences" JSONB,
    "brandSummary" TEXT,
    "targetAudienceSummary" TEXT,
    "toneOfVoice" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentAngles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketingSuggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiAnalysisUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'UNUSED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "platforms" "Platform"[] DEFAULT ARRAY[]::"Platform"[],
    "prompt" TEXT,
    "brief" TEXT,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "callToAction" TEXT,
    "model" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCalendarItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "generatedContentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" "Platform" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "ownerName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMemory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssetToGeneratedContent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssetToGeneratedContent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_workspaceId_key" ON "BrandProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "AssetBatch_workspaceId_idx" ON "AssetBatch"("workspaceId");

-- CreateIndex
CREATE INDEX "Asset_workspaceId_idx" ON "Asset"("workspaceId");

-- CreateIndex
CREATE INDEX "Asset_batchId_idx" ON "Asset"("batchId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "GeneratedContent_workspaceId_idx" ON "GeneratedContent"("workspaceId");

-- CreateIndex
CREATE INDEX "GeneratedContent_status_idx" ON "GeneratedContent"("status");

-- CreateIndex
CREATE INDEX "GeneratedContent_type_idx" ON "GeneratedContent"("type");

-- CreateIndex
CREATE INDEX "ContentCalendarItem_workspaceId_idx" ON "ContentCalendarItem"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentCalendarItem_generatedContentId_idx" ON "ContentCalendarItem"("generatedContentId");

-- CreateIndex
CREATE INDEX "ContentCalendarItem_scheduledAt_idx" ON "ContentCalendarItem"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentCalendarItem_status_idx" ON "ContentCalendarItem"("status");

-- CreateIndex
CREATE INDEX "BrandMemory_workspaceId_idx" ON "BrandMemory"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandMemory_type_idx" ON "BrandMemory"("type");

-- CreateIndex
CREATE INDEX "BrandMemory_isActive_idx" ON "BrandMemory"("isActive");

-- CreateIndex
CREATE INDEX "_AssetToGeneratedContent_B_index" ON "_AssetToGeneratedContent"("B");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetBatch" ADD CONSTRAINT "AssetBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AssetBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCalendarItem" ADD CONSTRAINT "ContentCalendarItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCalendarItem" ADD CONSTRAINT "ContentCalendarItem_generatedContentId_fkey" FOREIGN KEY ("generatedContentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMemory" ADD CONSTRAINT "BrandMemory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssetToGeneratedContent" ADD CONSTRAINT "_AssetToGeneratedContent_A_fkey" FOREIGN KEY ("A") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssetToGeneratedContent" ADD CONSTRAINT "_AssetToGeneratedContent_B_fkey" FOREIGN KEY ("B") REFERENCES "GeneratedContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
