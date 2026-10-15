-- Quiz mixto: un quiz de 20 preguntas con partidos de todas las ligas, por ventana (fin de semana o entre semana).
-- Los quizzes antiguos (una liga y jornada) se conservan tal cual; los nuevos no tienen jornada.

-- AlterTable
ALTER TABLE `quiz_events` ADD COLUMN `number` INTEGER NULL,
    ADD COLUMN `windowEnd` DATETIME(3) NULL,
    ADD COLUMN `windowKey` VARCHAR(191) NULL,
    ADD COLUMN `windowKind` ENUM('WEEKEND', 'MIDWEEK') NULL,
    ADD COLUMN `windowStart` DATETIME(3) NULL,
    MODIFY `matchdayId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `quiz_events_windowKey_key` ON `quiz_events`(`windowKey`);
