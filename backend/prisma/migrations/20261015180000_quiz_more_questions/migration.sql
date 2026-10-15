-- Quiz con mas variedad: resultado al descanso de cada partido y 8 tipos de pregunta nuevos (y las opciones de TOTAL_GOALS).

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuizQuestionType" ADD VALUE 'HALF_TIME_RESULT';
ALTER TYPE "QuizQuestionType" ADD VALUE 'FIRST_HALF_GOAL';
ALTER TYPE "QuizQuestionType" ADD VALUE 'SECOND_HALF_MORE_GOALS';
ALTER TYPE "QuizQuestionType" ADD VALUE 'GOAL_BOTH_HALVES';
ALTER TYPE "QuizQuestionType" ADD VALUE 'COMEBACK';
ALTER TYPE "QuizQuestionType" ADD VALUE 'DRAW';
ALTER TYPE "QuizQuestionType" ADD VALUE 'TOTAL_GOALS';
ALTER TYPE "QuizQuestionType" ADD VALUE 'ODD_GOALS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuizOption" ADD VALUE 'GOALS_0_1';
ALTER TYPE "QuizOption" ADD VALUE 'GOALS_2_3';
ALTER TYPE "QuizOption" ADD VALUE 'GOALS_4_PLUS';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "htAwayScore" INTEGER,
ADD COLUMN     "htHomeScore" INTEGER;

