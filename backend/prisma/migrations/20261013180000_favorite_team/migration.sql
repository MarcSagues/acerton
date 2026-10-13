-- Equipo favorito del perfil (ver users/team-catalog.ts): su nombre completo, o NULL si no hay.

-- AlterTable
ALTER TABLE `users` ADD COLUMN `favoriteTeam` VARCHAR(100) NULL;
