-- Quiz mixto: un quiz de 20 preguntas con partidos de todas las ligas, por ventana (fin de semana o entre semana).
-- Los quizzes antiguos (una liga y jornada) se conservan tal cual; los nuevos no tienen jornada.

-- CreateEnum
CREATE TYPE "QuizWindowKind" AS ENUM ('WEEKEND', 'MIDWEEK');

-- AlterTable
ALTER TABLE "quiz_events" ADD COLUMN     "number" INTEGER,
ADD COLUMN     "windowEnd" TIMESTAMP(3),
ADD COLUMN     "windowKey" TEXT,
ADD COLUMN     "windowKind" "QuizWindowKind",
ADD COLUMN     "windowStart" TIMESTAMP(3),
ALTER COLUMN "matchdayId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "quiz_events_windowKey_key" ON "quiz_events"("windowKey");
