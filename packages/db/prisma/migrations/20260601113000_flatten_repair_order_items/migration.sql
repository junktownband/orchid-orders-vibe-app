ALTER TABLE "RepairOrderItem"
  RENAME COLUMN "unitPriceCents" TO "priceCents";

ALTER TABLE "RepairOrderItem"
  RENAME COLUMN "unitCostCents" TO "costCents";

ALTER TABLE "RepairOrderItem"
  DROP COLUMN "quantity";
