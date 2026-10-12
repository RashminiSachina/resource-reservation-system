-- CreateTable
CREATE TABLE "ResourceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResourceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCategory_name_key" ON "ResourceCategory"("name");

-- AlterTable (add categoryId as nullable initially for safe backfill)
ALTER TABLE "Resource" ADD COLUMN "categoryId" TEXT;

-- Create default category for existing resources if any exist
INSERT INTO "ResourceCategory" ("id", "name", "description", "createdAt", "updatedAt")
VALUES ('cat_default_general', 'General', 'Default category for existing resources', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Backfill existing resources with the default category
UPDATE "Resource"
SET "categoryId" = (SELECT "id" FROM "ResourceCategory" WHERE "name" = 'General' LIMIT 1)
WHERE "categoryId" IS NULL;

-- AlterTable (enforce required categoryId)
ALTER TABLE "Resource" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Resource_categoryId_idx" ON "Resource"("categoryId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ResourceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

