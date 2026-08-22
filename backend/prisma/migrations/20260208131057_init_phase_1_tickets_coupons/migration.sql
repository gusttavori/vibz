/*
  Warnings:

  - You are about to drop the column `userDiscount` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `baseAmount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `partnerCommission` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `platformFeeFinal` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `platformFeeOriginal` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `totalPaid` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `userDiscount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `batch` on the `ticket_types` table. All the data in the column will be lost.
  - Added the required column `discountType` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountValue` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventDate` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformFee` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'processing';
ALTER TYPE "OrderStatus" ADD VALUE 'failed';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'expired';

-- DropForeignKey
ALTER TABLE "coupons" DROP CONSTRAINT "coupons_partnerId_fkey";

-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "userDiscount",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discountType" "DiscountType" NOT NULL,
ADD COLUMN     "discountValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "maxUses" INTEGER,
ADD COLUMN     "minPurchaseAmount" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usageLimitPerUser" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "usedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3),
ALTER COLUMN "partnerShare" DROP NOT NULL,
ALTER COLUMN "partnerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "eventDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "organizerInfo" JSONB,
ADD COLUMN     "sessions" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "baseAmount",
DROP COLUMN "partnerCommission",
DROP COLUMN "platformFeeFinal",
DROP COLUMN "platformFeeOriginal",
DROP COLUMN "totalPaid",
DROP COLUMN "userDiscount",
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "platformFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ticket_types" DROP COLUMN "batch",
ADD COLUMN     "batchName" TEXT,
ADD COLUMN     "minPerUser" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "salesEnd" TIMESTAMP(3),
ADD COLUMN     "salesStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "minFee" DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "premiumPrice" DOUBLE PRECISION NOT NULL DEFAULT 100.00,
    "standardPrice" DOUBLE PRECISION NOT NULL DEFAULT 50.00,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
