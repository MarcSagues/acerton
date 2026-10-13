-- CreateTable
CREATE TABLE `quiz_events` (
    `id` VARCHAR(191) NOT NULL,
    `matchdayId` VARCHAR(191) NOT NULL,
    `seasonLabel` VARCHAR(191) NOT NULL,
    `status` ENUM('SCHEDULED', 'OPEN', 'CLOSED', 'FINISHED') NOT NULL DEFAULT 'SCHEDULED',
    `rulesVersion` INTEGER NOT NULL DEFAULT 1,
    `closesAt` DATETIME(3) NOT NULL,
    `openedAt` DATETIME(3) NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quiz_events_matchdayId_key`(`matchdayId`),
    INDEX `quiz_events_seasonLabel_status_idx`(`seasonLabel`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_questions` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `type` ENUM('WINNER', 'BOTH_SCORE', 'OVER_2_5', 'HOME_CLEAN_SHEET', 'AWAY_CLEAN_SHEET', 'HOME_TWO_PLUS', 'AWAY_TWO_PLUS', 'WIN_BY_TWO_PLUS') NOT NULL,
    `options` JSON NOT NULL,
    `resolution` ENUM('PENDING', 'RESOLVED', 'VOID') NOT NULL DEFAULT 'PENDING',
    `correctOption` ENUM('HOME', 'DRAW', 'AWAY', 'YES', 'NO') NULL,

    INDEX `quiz_questions_matchId_idx`(`matchId`),
    UNIQUE INDEX `quiz_questions_eventId_order_key`(`eventId`, `order`),
    UNIQUE INDEX `quiz_questions_eventId_matchId_type_key`(`eventId`, `matchId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_participations` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `points` INTEGER NOT NULL DEFAULT 0,

    INDEX `quiz_participations_eventId_idx`(`eventId`),
    UNIQUE INDEX `quiz_participations_userId_eventId_key`(`userId`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_answers` (
    `id` VARCHAR(191) NOT NULL,
    `participationId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `option` ENUM('HOME', 'DRAW', 'AWAY', 'YES', 'NO') NOT NULL,
    `pointsEarned` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quiz_answers_questionId_idx`(`questionId`),
    UNIQUE INDEX `quiz_answers_participationId_questionId_key`(`participationId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quiz_events` ADD CONSTRAINT `quiz_events_matchdayId_fkey` FOREIGN KEY (`matchdayId`) REFERENCES `matchdays`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `quiz_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_participations` ADD CONSTRAINT `quiz_participations_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `quiz_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_participations` ADD CONSTRAINT `quiz_participations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_answers` ADD CONSTRAINT `quiz_answers_participationId_fkey` FOREIGN KEY (`participationId`) REFERENCES `quiz_participations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_answers` ADD CONSTRAINT `quiz_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
