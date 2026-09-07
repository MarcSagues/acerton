-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nameChangedAt" TIMESTAMP(3),
ADD COLUMN     "usernameConfirmed" BOOLEAN NOT NULL DEFAULT true;
