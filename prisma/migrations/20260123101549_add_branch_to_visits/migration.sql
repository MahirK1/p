-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ClientBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
