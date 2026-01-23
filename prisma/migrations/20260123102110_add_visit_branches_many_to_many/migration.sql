/*
  Warnings:

  - You are about to drop the column `branchId` on the `Visit` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "visit_branches" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visit_branches_visitId_branchId_key" ON "visit_branches"("visitId", "branchId");

-- Migrate existing data from branchId to visit_branches
INSERT INTO "visit_branches" ("id", "visitId", "branchId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    "id" as "visitId",
    "branchId",
    NOW()
FROM "Visit"
WHERE "branchId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "visit_branches" ADD CONSTRAINT "visit_branches_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_branches" ADD CONSTRAINT "visit_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ClientBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Visit" DROP CONSTRAINT "Visit_branchId_fkey";

-- AlterTable
ALTER TABLE "Visit" DROP COLUMN "branchId";
