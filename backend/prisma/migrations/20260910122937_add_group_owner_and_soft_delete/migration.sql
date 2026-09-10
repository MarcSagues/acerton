-- AlterTable: add columns nullable first so existing rows can be backfilled.
ALTER TABLE "groups" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "ownerId" TEXT;

-- Backfill: el propietario de cada grupo existente es su admin mas antiguo
-- (hoy el unico ADMIN posible es quien lo creo, ver GroupsService.create).
UPDATE "groups" g
SET "ownerId" = (
  SELECT gm."userId"
  FROM "group_memberships" gm
  WHERE gm."groupId" = g.id AND gm."role" = 'ADMIN'
  ORDER BY gm."joinedAt" ASC
  LIMIT 1
)
WHERE g."ownerId" IS NULL;

-- AlterTable: ahora que todas las filas tienen ownerId, se hace obligatorio.
ALTER TABLE "groups" ALTER COLUMN "ownerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
