-- AlterTable
ALTER TABLE "matchdays" DROP COLUMN "reminder1hSentAt",
DROP COLUMN "reminder24hSentAt",
DROP COLUMN "reminder30mSentAt",
DROP COLUMN "reminder5hSentAt";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "reminder1hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder30mSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder5hSentAt" TIMESTAMP(3);

