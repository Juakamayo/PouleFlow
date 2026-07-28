/*
  Warnings:

  - A unique constraint covering the columns `[poolId,boutOrder]` on the table `PoolBout` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `boutOrder` to the `PoolBout` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BoutStatus" AS ENUM ('COMPLETED', 'ABANDONMENT', 'EXCLUSION', 'MEDICAL');

-- AlterTable
ALTER TABLE "BracketMatch" ADD COLUMN     "status" "BoutStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "winnerId" INTEGER;

-- AlterTable
ALTER TABLE "PoolAssignment" ADD COLUMN     "indicator" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "touchesReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "touchesScored" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "victories" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PoolBout" ADD COLUMN     "boutOrder" INTEGER NOT NULL,
ADD COLUMN     "status" "BoutStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "winnerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PoolBout_poolId_boutOrder_key" ON "PoolBout"("poolId", "boutOrder");

-- AddForeignKey
ALTER TABLE "PoolBout" ADD CONSTRAINT "PoolBout_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Fencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Fencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
