CREATE TYPE "TaxMode" AS ENUM ('NONE', 'SELF_EMPLOYED');
CREATE TYPE "TaxSubject" AS ENUM ('INDIVIDUAL', 'BUSINESS');
CREATE TYPE "ExpenseKind" AS ENUM ('REGULAR', 'TAX');

ALTER TABLE "OrganizationSetting"
ADD COLUMN "taxMode" "TaxMode" NOT NULL DEFAULT 'NONE';

ALTER TABLE "RepairOrder"
ADD COLUMN "taxModeSnapshot" "TaxMode",
ADD COLUMN "taxSubject" "TaxSubject",
ADD COLUMN "taxRateBps" INTEGER,
ADD COLUMN "taxAmountCents" INTEGER;

ALTER TABLE "Expense"
ADD COLUMN "kind" "ExpenseKind" NOT NULL DEFAULT 'REGULAR';

CREATE INDEX "Expense_organizationId_kind_idx" ON "Expense"("organizationId", "kind");
