ALTER TABLE "Customer" ADD COLUMN "phoneNormalized" TEXT;

UPDATE "Customer"
SET "phoneNormalized" = regexp_replace(COALESCE("phone", ''), '\D', '', 'g')
WHERE "phone" IS NOT NULL;

CREATE INDEX "Customer_organizationId_phoneNormalized_idx" ON "Customer"("organizationId", "phoneNormalized");

CREATE INDEX "RepairOrder_organizationId_repairStatus_updatedAt_id_idx"
ON "RepairOrder"("organizationId", "repairStatus", "updatedAt", "id");
