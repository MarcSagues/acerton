/*
  Warnings:

  - You are about to drop the column `reminderSentAt` on the `matchdays` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "matchdays" DROP COLUMN "reminderSentAt",
ADD COLUMN     "reminder1hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder30mSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder5hSentAt" TIMESTAMP(3);
