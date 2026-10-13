-- Avisos opcionales del Quiz de jornada: preferencias (apagadas de serie), tipos de aviso nuevos
-- y marcas de "ya enviado" por evento y franja (ver QuizRemindersService).

-- AlterTable
ALTER TABLE `notification_preferences` ADD COLUMN `quizOpening` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `quizReminder1h` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `quizReminder24h` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('MATCHDAY_CLOSING_SOON', 'MATCHDAY_FINISHED', 'BADGE_EARNED', 'REENGAGEMENT', 'LEVEL_UP', 'QUIZ_OPENED', 'QUIZ_CLOSING_SOON') NOT NULL;

-- AlterTable
ALTER TABLE `quiz_events` ADD COLUMN `openNotifiedAt` DATETIME(3) NULL,
    ADD COLUMN `reminder1hSentAt` DATETIME(3) NULL,
    ADD COLUMN `reminder24hSentAt` DATETIME(3) NULL;

-- Los quizzes ya publicados no avisan de su apertura al desplegar: se abrieron antes de existir el aviso.
UPDATE `quiz_events` SET `openNotifiedAt` = COALESCE(`openedAt`, `createdAt`) WHERE `status` <> 'SCHEDULED';
