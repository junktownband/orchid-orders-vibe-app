ALTER TABLE "RepairOrderItem"
ADD COLUMN "assignedMasterMembershipId" TEXT,
ADD COLUMN "commissionPercentSnapshot" DECIMAL(5,4),
ADD COLUMN "commissionBaseCents" INTEGER,
ADD COLUMN "commissionAmountCents" INTEGER,
ADD COLUMN "commissionCalculatedAt" TIMESTAMP(3);

UPDATE "RepairOrderItem" roi
SET "assignedMasterMembershipId" = ro."assignedMasterMembershipId"
FROM "RepairOrder" ro
WHERE roi."repairOrderId" = ro."id"
  AND roi."type" = 'SERVICE'
  AND ro."assignedMasterMembershipId" IS NOT NULL;

CREATE INDEX "RepairOrderItem_organizationId_assignedMasterMembershipId_idx"
ON "RepairOrderItem"("organizationId", "assignedMasterMembershipId");

ALTER TABLE "RepairOrderItem"
ADD CONSTRAINT "RepairOrderItem_assignedMasterMembershipId_fkey"
FOREIGN KEY ("assignedMasterMembershipId") REFERENCES "Membership"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
