-- Funcionalidades de dev (Sprint 14: XP/nivel y referidos, favoritos de grupo) sobre la
-- baseline MySQL 0_init. Sustituye a las 4 migraciones de Postgres de dev
-- (group_favorite, xp_experience, level_up_notification, referral_system):
-- el esquema final es el mismo, solo cambia el SQL.

-- AlterTable: referralCode nace nullable para poder rellenar las filas existentes
-- antes de hacerlo obligatorio y unico (mas abajo).
ALTER TABLE `users` ADD COLUMN `experience` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referredById` VARCHAR(191) NULL;

-- Backfill: codigo legible (8 caracteres hex en mayuscula) para las cuentas ya
-- existentes; las cuentas nuevas usan el alfabeto sin caracteres ambiguos de
-- generateReferralCode.
UPDATE `users`
SET `referralCode` = UPPER(SUBSTRING(MD5(CONCAT(RAND(), `id`)), 1, 8))
WHERE `referralCode` IS NULL;

-- Ahora que todas las filas tienen referralCode, se hace obligatorio.
ALTER TABLE `users` MODIFY `referralCode` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `notification_preferences` ADD COLUMN `levelUp` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `level` INTEGER NULL,
    MODIFY `type` ENUM('MATCHDAY_CLOSING_SOON', 'MATCHDAY_FINISHED', 'BADGE_EARNED', 'REENGAGEMENT', 'LEVEL_UP') NOT NULL;

-- AlterTable
ALTER TABLE `group_memberships` ADD COLUMN `isFavorite` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `xp_events` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('PARTICIPATION', 'WIN_1X2', 'WIN_1X2_WILDCARD', 'EXACT_SCORE_WINNER', 'EXACT_SCORE_HIT', 'PERFECT_MATCHDAY_1X2', 'PERFECT_MATCHDAY_EXACT', 'PERFECT_MATCHDAY_ALL_EXACT', 'REFERRAL') NOT NULL,
    `amount` INTEGER NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `matchdayId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `xp_events_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_referralCode_key` ON `users`(`referralCode`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `xp_events` ADD CONSTRAINT `xp_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `xp_events` ADD CONSTRAINT `xp_events_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

