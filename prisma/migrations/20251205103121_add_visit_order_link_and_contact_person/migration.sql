-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contactPerson" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "visitId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
