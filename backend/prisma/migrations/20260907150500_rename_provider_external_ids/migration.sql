-- Renombra los ids del proveedor externo de datos de futbol a nombres
-- neutrales (no atados a un proveedor concreto), tras cambiar de
-- API-Football a football-data.org. Rename en lugar de drop+add para no
-- perder los datos ya sincronizados.

ALTER TABLE "competitions" RENAME COLUMN "apiFootballId" TO "externalId";
ALTER TABLE "matches" RENAME COLUMN "apiFootballFixtureId" TO "externalId";

ALTER INDEX "competitions_apiFootballId_key" RENAME TO "competitions_externalId_key";
ALTER INDEX "matches_apiFootballFixtureId_key" RENAME TO "matches_externalId_key";
