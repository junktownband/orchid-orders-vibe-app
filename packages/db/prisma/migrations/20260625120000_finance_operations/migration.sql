-- CreateEnum
CREATE TYPE "FinanceOperationType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "FinanceOperation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "type" "FinanceOperationType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceOperation_amountCents_check" CHECK ("amountCents" > 0),
    CONSTRAINT "FinanceOperation_pkey" PRIMARY KEY ("id")
);

-- Backfill default admin commission for existing memberships.
UPDATE "Membership"
SET "commissionPercent" = 0.6000
WHERE "role" = 'ADMIN' AND "commissionPercent" IS NULL;

-- CreateIndex
CREATE INDEX "FinanceOperation_organizationId_occurredAt_idx" ON "FinanceOperation"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceOperation_organizationId_type_idx" ON "FinanceOperation"("organizationId", "type");

-- CreateIndex
CREATE INDEX "Payment_org_voided_paid_idx" ON "Payment"("organizationId", "isVoided", "paidAt");

-- CreateIndex
CREATE INDEX "Expense_org_status_spent_idx" ON "Expense"("organizationId", "status", "spentAt");

-- CreateIndex
CREATE INDEX "Expense_org_kind_status_spent_idx" ON "Expense"("organizationId", "kind", "status", "spentAt");

-- CreateIndex
CREATE INDEX "RepairOrderItem_org_commission_calc_idx" ON "RepairOrderItem"("organizationId", "commissionCalculatedAt", "id");

-- CreateIndex
CREATE INDEX "RepairOrderItem_org_payout_calc_idx" ON "RepairOrderItem"("organizationId", "commissionPayoutStatus", "commissionCalculatedAt", "id");

-- CreateIndex
CREATE INDEX "RepairOrderItem_org_payout_paid_idx" ON "RepairOrderItem"("organizationId", "commissionPayoutStatus", "commissionPaidAt", "id");

-- CreateIndex
CREATE INDEX "RepairOrderItem_org_master_payout_calc_idx" ON "RepairOrderItem"("organizationId", "assignedMasterMembershipId", "commissionPayoutStatus", "commissionCalculatedAt", "id");

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
