CREATE TYPE "CommissionPayoutStatus" AS ENUM ('UNPAID', 'PAID');

ALTER TABLE "RepairOrderItem"
ADD COLUMN "commissionPayoutStatus" "CommissionPayoutStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "commissionPaidAt" TIMESTAMP(3),
ADD COLUMN "commissionPaidByUserId" TEXT;

CREATE INDEX "RepairOrderItem_organizationId_commissionPayoutStatus_idx"
ON "RepairOrderItem"("organizationId", "commissionPayoutStatus");

ALTER TABLE "RepairOrderItem"
ADD CONSTRAINT "RepairOrderItem_commissionPaidByUserId_fkey"
FOREIGN KEY ("commissionPaidByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
