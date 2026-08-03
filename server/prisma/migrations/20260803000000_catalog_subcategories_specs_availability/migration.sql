-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('MADE_TO_ORDER', 'IN_STOCK', 'ON_REQUEST');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" INTEGER,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "priceText";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "inStock",
DROP COLUMN "priceMinor",
DROP COLUMN "priceText",
DROP COLUMN "range",
DROP COLUMN "stockCount",
ADD COLUMN     "availability" "Availability" NOT NULL DEFAULT 'MADE_TO_ORDER',
ADD COLUMN     "leadTimeDays" INTEGER;

-- CreateTable
CREATE TABLE "SpecLabel" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelRu" TEXT NOT NULL,
    "labelUz" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,
    "valueEn" TEXT NOT NULL,
    "valueRu" TEXT NOT NULL,
    "valueUz" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecLabel_slug_key" ON "SpecLabel"("slug");

-- CreateIndex
CREATE INDEX "ProductSpec_productId_idx" ON "ProductSpec"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpec_productId_labelId_key" ON "ProductSpec"("productId", "labelId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "SpecLabel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

