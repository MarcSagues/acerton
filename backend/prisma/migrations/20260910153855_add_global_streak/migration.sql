-- CreateTable
CREATE TABLE "global_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastMatchdayId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_streaks_userId_key" ON "global_streaks"("userId");

-- AddForeignKey
ALTER TABLE "global_streaks" ADD CONSTRAINT "global_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_streaks" ADD CONSTRAINT "global_streaks_lastMatchdayId_fkey" FOREIGN KEY ("lastMatchdayId") REFERENCES "matchdays"("id") ON DELETE SET NULL ON UPDATE CASCADE;
