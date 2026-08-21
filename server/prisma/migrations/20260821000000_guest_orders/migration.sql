-- Guest orders: placing an order no longer requires an account. `userId`
-- becomes optional and every order carries its own contact snapshot, which is
-- what sales call back on.

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactCompany" TEXT;

-- Backfill existing orders from the profile that placed them, so the admin
-- table shows a contact for historical rows too.
UPDATE "Order" o
SET "contactName"    = COALESCE(u."name", u."email"),
    "contactPhone"   = u."phone",
    "contactEmail"   = u."email",
    "contactCompany" = u."company"
FROM "User" u
WHERE o."userId" = u."id";

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- AlterTable: a free-form request only needs a person and a phone now.
ALTER TABLE "QuoteRequest" ALTER COLUMN "companyName" DROP NOT NULL;
ALTER TABLE "QuoteRequest" ALTER COLUMN "email" DROP NOT NULL;
