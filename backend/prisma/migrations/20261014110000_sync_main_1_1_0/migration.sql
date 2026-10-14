-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appleSub" TEXT;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "awayTeamShort" TEXT,
ADD COLUMN     "homeTeamShort" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_appleSub_key" ON "users"("appleSub");
