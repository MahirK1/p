-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discountPercent" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "ClientBranch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBranch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientBranch" ADD CONSTRAINT "ClientBranch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ClientBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
