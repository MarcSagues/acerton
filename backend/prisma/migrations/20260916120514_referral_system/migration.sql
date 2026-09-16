-- AlterEnum: nuevos tipos de evento de XP (Sprint 14) — pleno con marcador
-- exacto en TODOS los partidos (distinto de PERFECT_MATCHDAY_EXACT, que solo
-- exige acertar el ganador en todos) y XP de referidos.
ALTER TYPE "XpEventType" ADD VALUE 'PERFECT_MATCHDAY_ALL_EXACT';
ALTER TYPE "XpEventType" ADD VALUE 'REFERRAL';

-- AlterTable: XpEvent.groupId pasa a opcional — REFERRAL no pertenece a ningun grupo.
ALTER TABLE "xp_events" ALTER COLUMN "groupId" DROP NOT NULL;

-- AlterTable: add referralCode/referredById nullable primero para poder rellenar las filas existentes.
ALTER TABLE "users" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- Backfill: codigo legible (8 caracteres hex en mayuscula) para las cuentas ya existentes;
-- las cuentas nuevas usan el alfabeto sin caracteres ambiguos de generateReferralCode.
UPDATE "users"
SET "referralCode" = upper(substr(md5(random()::text || id), 1, 8))
WHERE "referralCode" IS NULL;

-- AlterTable: ahora que todas las filas tienen referralCode, se hace obligatorio y unico.
ALTER TABLE "users" ALTER COLUMN "referralCode" SET NOT NULL;
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
