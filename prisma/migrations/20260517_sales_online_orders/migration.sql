CREATE TYPE "OnlineOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "sales"
  ADD COLUMN "paymentType" VARCHAR(40) NOT NULL DEFAULT 'Naqd',
  ADD COLUMN "discountPercent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE "online_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pharmacyId" UUID,
  "customerId" UUID,
  "customerName" VARCHAR(150) NOT NULL,
  "customerPhone" VARCHAR(30),
  "status" "OnlineOrderStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount" DECIMAL(12, 2) NOT NULL,
  "items" JSONB NOT NULL,
  "approvedSaleId" UUID,
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "online_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "online_orders_pharmacyId_idx" ON "online_orders"("pharmacyId");
CREATE INDEX "online_orders_customerId_idx" ON "online_orders"("customerId");
CREATE INDEX "online_orders_status_idx" ON "online_orders"("status");
CREATE INDEX "online_orders_createdAt_idx" ON "online_orders"("createdAt");

ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_approvedSaleId_fkey" FOREIGN KEY ("approvedSaleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
