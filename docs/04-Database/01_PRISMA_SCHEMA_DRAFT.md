# Prisma Schema Draft

Ниже черновик схемы. Codex должен перенести ее в `packages/db/prisma/schema.prisma`, поправить синтаксис под актуальную версию Prisma и создать миграции.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  ADMIN
  MANAGER
  MASTER
}

enum RepairStatus {
  ACCEPTED
  IN_PROGRESS
  READY
  ISSUED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  VOIDED
}

enum ExpenseStatus {
  DRAFT
  CONFIRMED
  VOIDED
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  VOID
  CONFIRM
  LOGIN
  STATUS_CHANGE
  PAYMENT_ADDED
  PAYMENT_VOIDED
  COMMISSION_OVERRIDE
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  currency  String   @default("RUB")
  timezone  String   @default("Asia/Yekaterinburg")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships    Membership[]
  customers      Customer[]
  instruments    Instrument[]
  repairOrders   RepairOrder[]
  payments       Payment[]
  expenses       Expense[]
  paymentMethods PaymentMethod[]
  expenseCategories ExpenseCategory[]
  auditLogs      AuditLog[]
  settings       OrganizationSetting?
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  phone        String?
  avatarUrl    String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships Membership[]
  acceptedPayments Payment[] @relation("PaymentAcceptedBy")
  createdExpenses Expense[] @relation("ExpenseCreatedBy")
  auditLogs AuditLog[]
}

model Membership {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           Role
  commissionPercent Decimal? @db.Decimal(5, 4)
  isActive       Boolean @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  assignedRepairOrders RepairOrder[] @relation("RepairAssignedMaster")

  @@unique([organizationId, userId])
  @@index([organizationId, role])
}

model Customer {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  phone          String?
  email          String?
  note           String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  instruments  Instrument[]
  repairOrders RepairOrder[]

  @@index([organizationId, name])
  @@index([organizationId, phone])
}

model Instrument {
  id             String   @id @default(cuid())
  organizationId String
  customerId     String?
  type           String   @default("guitar")
  brand          String?
  model          String?
  serialNumber   String?
  note           String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer     Customer?    @relation(fields: [customerId], references: [id], onDelete: SetNull)
  repairOrders RepairOrder[]

  @@index([organizationId, brand, model])
}

model RepairOrder {
  id             String   @id @default(cuid())
  organizationId String
  orderNumber    String
  customerId     String?
  instrumentId   String?
  assignedMasterMembershipId String?

  title          String?
  description    String
  totalAmountCents Int
  actualCommissionCents Int?

  repairStatus  RepairStatus  @default(ACCEPTED)
  paymentStatus PaymentStatus @default(UNPAID)

  acceptedAt    DateTime?
  completedAt   DateTime?
  issuedAt      DateTime?
  cancelledAt   DateTime?
  comment       String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer     Customer?    @relation(fields: [customerId], references: [id], onDelete: SetNull)
  instrument   Instrument?  @relation(fields: [instrumentId], references: [id], onDelete: SetNull)
  assignedMaster Membership? @relation("RepairAssignedMaster", fields: [assignedMasterMembershipId], references: [id], onDelete: SetNull)
  payments     Payment[]
  expenses     Expense[]

  @@unique([organizationId, orderNumber])
  @@index([organizationId, repairStatus])
  @@index([organizationId, paymentStatus])
  @@index([organizationId, createdAt])
}

model Payment {
  id             String   @id @default(cuid())
  organizationId String
  repairOrderId  String
  acceptedByUserId String?
  paymentMethodId String?
  amountCents    Int
  paidAt         DateTime
  comment        String?
  isVoided       Boolean @default(false)
  voidReason     String?
  voidedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  repairOrder  RepairOrder  @relation(fields: [repairOrderId], references: [id], onDelete: Cascade)
  acceptedBy   User?        @relation("PaymentAcceptedBy", fields: [acceptedByUserId], references: [id], onDelete: SetNull)
  paymentMethod PaymentMethod? @relation(fields: [paymentMethodId], references: [id], onDelete: SetNull)

  @@index([organizationId, paidAt])
  @@index([repairOrderId])
}

model Expense {
  id             String   @id @default(cuid())
  organizationId String
  categoryId     String?
  createdByUserId String?
  repairOrderId  String?
  paymentMethodId String?
  amountCents    Int
  spentAt         DateTime
  spentByName     String?
  description     String
  status          ExpenseStatus @default(DRAFT)
  comment         String?
  confirmedAt     DateTime?
  voidedAt        DateTime?
  voidReason      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  category     ExpenseCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  repairOrder  RepairOrder? @relation(fields: [repairOrderId], references: [id], onDelete: SetNull)
  paymentMethod PaymentMethod? @relation(fields: [paymentMethodId], references: [id], onDelete: SetNull)
  createdBy    User? @relation("ExpenseCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([organizationId, spentAt])
  @@index([organizationId, status])
}

model PaymentMethod {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  isActive       Boolean @default(true)
  sortOrder      Int     @default(100)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  payments Payment[]
  expenses Expense[]

  @@unique([organizationId, name])
}

model ExpenseCategory {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  color          String?
  isActive       Boolean @default(true)
  sortOrder      Int     @default(100)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  expenses Expense[]

  @@unique([organizationId, name])
}

model OrganizationSetting {
  id             String @id @default(cuid())
  organizationId String @unique
  allowOverpayment Boolean @default(false)
  countDraftExpensesInAnalytics Boolean @default(false)
  defaultRepairWarrantyDays Int @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id             String @id @default(cuid())
  organizationId String
  userId         String?
  entityType     String
  entityId       String
  action         AuditAction
  beforeJson     Json?
  afterJson      Json?
  comment        String?
  ip             String?
  userAgent      String?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt])
}
```
