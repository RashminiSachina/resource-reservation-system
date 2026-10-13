-- AlterTable
-- Default true preserves current behaviour: existing resources still require admin approval.
ALTER TABLE "Resource" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true;
