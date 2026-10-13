-- Avisos opcionales del Quiz de jornada (port a Postgres de la migracion de main): preferencias
-- (apagadas de serie), tipos de aviso nuevos y marcas de "ya enviado" por evento y franja.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'QUIZ_OPENED';
ALTER TYPE "NotificationType" ADD VALUE 'QUIZ_CLOSING_SOON';

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "quizOpening" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quizReminder1h" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quizReminder24h" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quiz_events" ADD COLUMN     "openNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "reminder1hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3);

-- Los quizzes ya publicados no avisan de su apertura al desplegar: se abrieron antes de existir el aviso.
UPDATE "quiz_events" SET "openNotifiedAt" = COALESCE("openedAt", "createdAt") WHERE "status" <> 'SCHEDULED';
