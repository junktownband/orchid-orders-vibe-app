UPDATE "RepairOrder"
SET "totalCostCents" = COALESCE("totalCostCents", 0),
    "grossProfitCents" = "totalAmountCents" - COALESCE("totalCostCents", 0)
WHERE "deletedAt" IS NULL;

UPDATE "RepairOrder"
SET "paidAt" = COALESCE("paidAt", "updatedAt")
WHERE "paymentStatus" = 'PAID'
  AND "paidAt" IS NULL
  AND "deletedAt" IS NULL;

INSERT INTO "RepairOrderItem" (
  "id",
  "organizationId",
  "repairOrderId",
  "serviceCatalogItemId",
  "nameSnapshot",
  "type",
  "quantity",
  "unitPriceCents",
  "unitCostCents",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('legacy_', "RepairOrder"."id"),
  "RepairOrder"."organizationId",
  "RepairOrder"."id",
  NULL,
  CASE
    WHEN LENGTH(TRIM("RepairOrder"."description")) >= 2 THEN "RepairOrder"."description"
    ELSE 'Ремонт'
  END,
  'SERVICE'::"ServiceType",
  1,
  "RepairOrder"."totalAmountCents",
  COALESCE("RepairOrder"."totalCostCents", 0),
  "RepairOrder"."createdAt",
  "RepairOrder"."updatedAt"
FROM "RepairOrder"
WHERE "RepairOrder"."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "RepairOrderItem"
    WHERE "RepairOrderItem"."repairOrderId" = "RepairOrder"."id"
  );
