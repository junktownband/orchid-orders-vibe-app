UPDATE "ServiceCatalogItem"
SET "type" = 'SERVICE'
WHERE "type" = 'LABOR';

UPDATE "RepairOrderItem"
SET "type" = 'SERVICE'
WHERE "type" = 'LABOR';

ALTER TABLE "ServiceCatalogItem" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "RepairOrderItem" ALTER COLUMN "type" DROP DEFAULT;

ALTER TYPE "ServiceType" RENAME TO "ServiceType_old";
CREATE TYPE "ServiceType" AS ENUM ('SERVICE', 'MATERIAL', 'STRINGS', 'PART', 'OTHER');

ALTER TABLE "ServiceCatalogItem"
  ALTER COLUMN "type" TYPE "ServiceType"
  USING "type"::text::"ServiceType";

ALTER TABLE "RepairOrderItem"
  ALTER COLUMN "type" TYPE "ServiceType"
  USING "type"::text::"ServiceType";

ALTER TABLE "ServiceCatalogItem" ALTER COLUMN "type" SET DEFAULT 'SERVICE';
ALTER TABLE "RepairOrderItem" ALTER COLUMN "type" SET DEFAULT 'SERVICE';

DROP TYPE "ServiceType_old";
