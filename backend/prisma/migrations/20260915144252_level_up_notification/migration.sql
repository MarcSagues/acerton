-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEVEL_UP';

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "levelUp" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "level" INTEGER;

