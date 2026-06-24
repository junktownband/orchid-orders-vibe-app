UPDATE "RepairOrder"
SET "paymentStatus" = 'PAID'
WHERE "paymentStatus" = 'OVERPAID';

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";

CREATE TYPE "PaymentStatus" AS ENUM (
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'VOIDED'
);

ALTER TABLE "RepairOrder"
  ALTER COLUMN "paymentStatus" DROP DEFAULT,
  ALTER COLUMN "paymentStatus" TYPE "PaymentStatus"
    USING "paymentStatus"::text::"PaymentStatus",
  ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';

DROP TYPE "PaymentStatus_old";
