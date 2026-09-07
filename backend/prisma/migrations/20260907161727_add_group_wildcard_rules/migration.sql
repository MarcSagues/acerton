-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "wildcardDoubleChancePerSeason" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "wildcardDoublePointsPerSeason" INTEGER NOT NULL DEFAULT 3;
