-- Rediseno del comodin: se elimina el "doble puntos" (WildcardType) y el
-- cupo de temporada; el unico comodin que queda es la remontada (doble
-- oportunidad), cuya disponibilidad se calcula en caliente segun la
-- diferencia de puntos con el lider (ver WildcardsService), no se guarda en
-- una tabla de uso propia. Datos de prueba existentes, aceptable perderlos.

-- Tabla de uso de comodines ya no hace falta: el uso se cuenta directamente
-- sobre Prediction.doubleChanceOption.
DROP TABLE "wildcards";
DROP TYPE "WildcardType";

ALTER TABLE "predictions" DROP COLUMN "isWildcard";

ALTER TABLE "groups" DROP COLUMN "wildcardDoubleChancePerSeason";
ALTER TABLE "groups" DROP COLUMN "wildcardDoublePointsPerSeason";
ALTER TABLE "groups" ADD COLUMN "comebackEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "groups" ADD COLUMN "comebackPointsPerBonus" INTEGER NOT NULL DEFAULT 6;
