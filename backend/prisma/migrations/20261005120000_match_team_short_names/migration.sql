-- Nombre corto de los equipos de cada partido ("Barça", "Atleti"), el que da el proveedor
-- de datos, para las imagenes de compartir. Nullable: los partidos ya existentes se rellenan
-- solos desde el proveedor (MatchdaysService.backfillTeamShortNames) y mientras tanto la app
-- usa el nombre completo.

-- AlterTable
ALTER TABLE `matches` ADD COLUMN `awayTeamShort` VARCHAR(191) NULL,
    ADD COLUMN `homeTeamShort` VARCHAR(191) NULL;
