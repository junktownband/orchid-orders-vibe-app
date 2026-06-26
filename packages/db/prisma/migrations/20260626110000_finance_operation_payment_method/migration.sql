-- Add nullable method links for existing manual operations; new API requests require it.
ALTER TABLE "FinanceOperation" ADD COLUMN "paymentMethodId" TEXT;

CREATE INDEX "FinanceOperation_organizationId_paymentMethodId_idx" ON "FinanceOperation"("organizationId", "paymentMethodId");

ALTER TABLE "FinanceOperation"
  ADD CONSTRAINT "FinanceOperation_paymentMethodId_fkey"
  FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
