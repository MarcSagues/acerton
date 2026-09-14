-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "reengagement" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "lastClosingReminderPushAt" TIMESTAMP(3),
ADD COLUMN     "reengagementPushSentAt" TIMESTAMP(3);

