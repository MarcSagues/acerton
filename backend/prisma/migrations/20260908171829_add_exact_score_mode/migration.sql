-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('ONE_X_TWO', 'EXACT_SCORE');

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "scoringMode" "ScoringMode" NOT NULL DEFAULT 'ONE_X_TWO';

-- AlterTable
ALTER TABLE "predictions" ADD COLUMN     "predictedAwayScore" INTEGER,
ADD COLUMN     "predictedHomeScore" INTEGER;
