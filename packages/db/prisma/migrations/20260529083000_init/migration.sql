-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MASTER');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('ACCEPTED', 'IN_PROGRESS', 'READY', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VOID', 'CONFIRM', 'LOGIN', 'STATUS_CHANGE', 'PAYMENT_ADDED', 'PAYMENT_VOIDED', 'COMMISSION_OVERRIDE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Yekaterinburg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "commissionPercent" DECIMAL(5,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'guitar',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "instrumentId" TEXT,
    "assignedMasterMembershipId" TEXT,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "actualCommissionCents" INTEGER,
    "repairStatus" "RepairStatus" NOT NULL DEFAULT 'ACCEPTED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "paymentMethodId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdByUserId" TEXT,
    "repairOrderId" TEXT,
    "paymentMethodId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "spentByName" TEXT,
    "description" TEXT NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "comment" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "allowOverpayment" BOOLEAN NOT NULL DEFAULT false,
    "countDraftExpensesInAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "defaultRepairWarrantyDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "comment" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Customer_organizationId_phone_idx" ON "Customer"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Instrument_organizationId_brand_model_idx" ON "Instrument"("organizationId", "brand", "model");

-- CreateIndex
CREATE INDEX "RepairOrder_organizationId_repairStatus_idx" ON "RepairOrder"("organizationId", "repairStatus");

-- CreateIndex
CREATE INDEX "RepairOrder_organizationId_paymentStatus_idx" ON "RepairOrder"("organizationId", "paymentStatus");

-- CreateIndex
CREATE INDEX "RepairOrder_organizationId_createdAt_idx" ON "RepairOrder"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepairOrder_organizationId_orderNumber_key" ON "RepairOrder"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "Payment_organizationId_paidAt_idx" ON "Payment"("organizationId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_repairOrderId_idx" ON "Payment"("repairOrderId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_spentAt_idx" ON "Expense"("organizationId", "spentAt");

-- CreateIndex
CREATE INDEX "Expense_organizationId_status_idx" ON "Expense"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_organizationId_name_key" ON "PaymentMethod"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_organizationId_name_key" ON "ExpenseCategory"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSetting_organizationId_key" ON "OrganizationSetting"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_idx" ON "AuditLog"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_assignedMasterMembershipId_fkey" FOREIGN KEY ("assignedMasterMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSetting" ADD CONSTRAINT "OrganizationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
