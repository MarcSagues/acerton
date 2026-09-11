-- AlterTable
ALTER TABLE "group_memberships" ADD COLUMN     "mutedNotifications" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "matchdays" ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchdayOpening" BOOLEAN NOT NULL DEFAULT true,
    "reminder24h" BOOLEAN NOT NULL DEFAULT false,
    "reminder5h" BOOLEAN NOT NULL DEFAULT false,
    "reminder1h" BOOLEAN NOT NULL DEFAULT true,
    "reminder30m" BOOLEAN NOT NULL DEFAULT false,
    "matchFinishedPoints" BOOLEAN NOT NULL DEFAULT false,
    "matchdayFinishedResult" BOOLEAN NOT NULL DEFAULT true,
    "badgeEarned" BOOLEAN NOT NULL DEFAULT true,
    "seasonFinishedTrophies" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
