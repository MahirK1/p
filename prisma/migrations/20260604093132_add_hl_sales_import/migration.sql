-- CreateTable
CREATE TABLE "hl_sales_imports" (
    "id" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "grandQuantity" DECIMAL(14,2) NOT NULL,
    "fileName" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hl_sales_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hl_partner_sales" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "clientId" TEXT,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "totalQuantity" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "hl_partner_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hl_partner_sale_items" (
    "id" TEXT NOT NULL,
    "partnerSaleId" TEXT NOT NULL,
    "lineNo" INTEGER,
    "article" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "hl_partner_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hl_sales_imports_periodFrom_periodTo_key" ON "hl_sales_imports"("periodFrom", "periodTo");

-- CreateIndex
CREATE INDEX "hl_partner_sales_importId_idx" ON "hl_partner_sales"("importId");

-- CreateIndex
CREATE INDEX "hl_partner_sales_clientId_idx" ON "hl_partner_sales"("clientId");

-- CreateIndex
CREATE INDEX "hl_partner_sale_items_partnerSaleId_idx" ON "hl_partner_sale_items"("partnerSaleId");

-- AddForeignKey
ALTER TABLE "hl_partner_sales" ADD CONSTRAINT "hl_partner_sales_importId_fkey" FOREIGN KEY ("importId") REFERENCES "hl_sales_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hl_partner_sales" ADD CONSTRAINT "hl_partner_sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hl_partner_sale_items" ADD CONSTRAINT "hl_partner_sale_items_partnerSaleId_fkey" FOREIGN KEY ("partnerSaleId") REFERENCES "hl_partner_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
