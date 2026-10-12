-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('SCHEDULED', 'OPEN', 'CLOSED', 'FINISHED');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('WINNER', 'BOTH_SCORE', 'OVER_2_5', 'HOME_CLEAN_SHEET', 'AWAY_CLEAN_SHEET', 'HOME_TWO_PLUS', 'AWAY_TWO_PLUS', 'WIN_BY_TWO_PLUS');

-- CreateEnum
CREATE TYPE "QuizOption" AS ENUM ('HOME', 'DRAW', 'AWAY', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "QuizResolution" AS ENUM ('PENDING', 'RESOLVED', 'VOID');

-- CreateTable
CREATE TABLE "quiz_events" (
    "id" TEXT NOT NULL,
    "matchdayId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "status" "QuizStatus" NOT NULL DEFAULT 'SCHEDULED',
    "rulesVersion" INTEGER NOT NULL DEFAULT 1,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QuizQuestionType" NOT NULL,
    "options" JSONB NOT NULL,
    "resolution" "QuizResolution" NOT NULL DEFAULT 'PENDING',
    "correctOption" "QuizOption",

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_participations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "option" "QuizOption" NOT NULL,
    "pointsEarned" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_events_matchdayId_key" ON "quiz_events"("matchdayId");

-- CreateIndex
CREATE INDEX "quiz_events_seasonLabel_status_idx" ON "quiz_events"("seasonLabel", "status");

-- CreateIndex
CREATE INDEX "quiz_questions_matchId_idx" ON "quiz_questions"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_eventId_order_key" ON "quiz_questions"("eventId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_eventId_matchId_type_key" ON "quiz_questions"("eventId", "matchId", "type");

-- CreateIndex
CREATE INDEX "quiz_participations_eventId_idx" ON "quiz_participations"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_participations_userId_eventId_key" ON "quiz_participations"("userId", "eventId");

-- CreateIndex
CREATE INDEX "quiz_answers_questionId_idx" ON "quiz_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_participationId_questionId_key" ON "quiz_answers"("participationId", "questionId");

-- AddForeignKey
ALTER TABLE "quiz_events" ADD CONSTRAINT "quiz_events_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "matchdays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "quiz_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_participations" ADD CONSTRAINT "quiz_participations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "quiz_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_participations" ADD CONSTRAINT "quiz_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "quiz_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

