-- CreateTable
CREATE TABLE "ad_reward_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "matchdayId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_reward_claims_userId_groupId_matchdayId_key" ON "ad_reward_claims"("userId", "groupId", "matchdayId");

-- AddForeignKey
ALTER TABLE "ad_reward_claims" ADD CONSTRAINT "ad_reward_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_reward_claims" ADD CONSTRAINT "ad_reward_claims_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_reward_claims" ADD CONSTRAINT "ad_reward_claims_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "matchdays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

