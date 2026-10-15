-- Quiz con mas variedad: resultado al descanso de cada partido y 8 tipos de pregunta nuevos (y las opciones de TOTAL_GOALS).

-- AlterTable
ALTER TABLE `matches` ADD COLUMN `htAwayScore` INTEGER NULL,
    ADD COLUMN `htHomeScore` INTEGER NULL;

-- AlterTable
ALTER TABLE `quiz_questions` MODIFY `type` ENUM('WINNER', 'BOTH_SCORE', 'OVER_2_5', 'HOME_CLEAN_SHEET', 'AWAY_CLEAN_SHEET', 'HOME_TWO_PLUS', 'AWAY_TWO_PLUS', 'WIN_BY_TWO_PLUS', 'HALF_TIME_RESULT', 'FIRST_HALF_GOAL', 'SECOND_HALF_MORE_GOALS', 'GOAL_BOTH_HALVES', 'COMEBACK', 'DRAW', 'TOTAL_GOALS', 'ODD_GOALS') NOT NULL,
    MODIFY `correctOption` ENUM('HOME', 'DRAW', 'AWAY', 'YES', 'NO', 'GOALS_0_1', 'GOALS_2_3', 'GOALS_4_PLUS') NULL;

-- AlterTable
ALTER TABLE `quiz_answers` MODIFY `option` ENUM('HOME', 'DRAW', 'AWAY', 'YES', 'NO', 'GOALS_0_1', 'GOALS_2_3', 'GOALS_4_PLUS') NOT NULL;

