-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('LABOR', 'SERVICE', 'MATERIAL', 'STRINGS', 'PART', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "repairOrderItemId" TEXT;

-- AlterTable
ALTER TABLE "RepairOrder" ADD COLUMN     "grossProfitCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidByUserId" TEXT,
ADD COLUMN     "totalCostCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL DEFAULT 'LABOR',
    "defaultPriceCents" INTEGER NOT NULL,
    "defaultCostCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairOrderItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "serviceCatalogItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL DEFAULT 'LABOR',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_organizationId_type_idx" ON "ServiceCatalogItem"("organizationId", "type");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_organizationId_isActive_idx" ON "ServiceCatalogItem"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogItem_organizationId_name_key" ON "ServiceCatalogItem"("organizationId", "name");

-- CreateIndex
CREATE INDEX "RepairOrderItem_organizationId_repairOrderId_idx" ON "RepairOrderItem"("organizationId", "repairOrderId");

-- CreateIndex
CREATE INDEX "RepairOrderItem_organizationId_serviceCatalogItemId_idx" ON "RepairOrderItem"("organizationId", "serviceCatalogItemId");

-- CreateIndex
CREATE INDEX "RepairOrderItem_organizationId_type_idx" ON "RepairOrderItem"("organizationId", "type");

-- CreateIndex
CREATE INDEX "Expense_organizationId_repairOrderId_idx" ON "Expense"("organizationId", "repairOrderId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_repairOrderItemId_idx" ON "Expense"("organizationId", "repairOrderItemId");

-- CreateIndex
CREATE INDEX "RepairOrder_organizationId_paidAt_idx" ON "RepairOrder"("organizationId", "paidAt");

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrderItem" ADD CONSTRAINT "RepairOrderItem_serviceCatalogItemId_fkey" FOREIGN KEY ("serviceCatalogItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_repairOrderItemId_fkey" FOREIGN KEY ("repairOrderItemId") REFERENCES "RepairOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
