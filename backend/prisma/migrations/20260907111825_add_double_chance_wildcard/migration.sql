-- CreateEnum
CREATE TYPE "DoubleChanceOption" AS ENUM ('HOME_OR_DRAW', 'DRAW_OR_AWAY', 'HOME_OR_AWAY');

-- AlterEnum
ALTER TYPE "WildcardType" ADD VALUE 'DOUBLE_CHANCE';

-- AlterTable
ALTER TABLE "predictions" ADD COLUMN     "doubleChanceOption" "DoubleChanceOption",
ALTER COLUMN "choice" DROP NOT NULL;
