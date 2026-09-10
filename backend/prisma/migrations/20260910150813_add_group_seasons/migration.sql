-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "seasonEndPreviewAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ranking_snapshots" ADD COLUMN     "groupSeasonId" TEXT;

-- CreateTable
CREATE TABLE "group_seasons" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "group_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_seasons_groupId_endedAt_idx" ON "group_seasons"("groupId", "endedAt");

-- AddForeignKey
ALTER TABLE "group_seasons" ADD CONSTRAINT "group_seasons_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_snapshots" ADD CONSTRAINT "ranking_snapshots_groupSeasonId_fkey" FOREIGN KEY ("groupSeasonId") REFERENCES "group_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
