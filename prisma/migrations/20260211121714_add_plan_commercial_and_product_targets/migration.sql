-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "commercialId" TEXT;
ALTER TABLE "Plan" ALTER COLUMN "totalTarget" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlanProductTarget" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityTarget" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanProductTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanProductTarget_planId_productId_key" ON "PlanProductTarget"("planId", "productId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanProductTarget" ADD CONSTRAINT "PlanProductTarget_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanProductTarget" ADD CONSTRAINT "PlanProductTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
