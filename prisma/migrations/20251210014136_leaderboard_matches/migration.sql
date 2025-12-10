-- CreateTable
CREATE TABLE "LeaderboardMatch" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "entryAId" TEXT NOT NULL,
    "entryBId" TEXT NOT NULL,
    "winnerId" TEXT,
    "pairKey" TEXT NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardMatch_playerId_leaderboardId_pairKey_key" ON "LeaderboardMatch"("playerId", "leaderboardId", "pairKey");

-- AddForeignKey
ALTER TABLE "LeaderboardMatch" ADD CONSTRAINT "LeaderboardMatch_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "Leaderboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardMatch" ADD CONSTRAINT "LeaderboardMatch_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardMatch" ADD CONSTRAINT "LeaderboardMatch_entryAId_fkey" FOREIGN KEY ("entryAId") REFERENCES "LeaderboardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardMatch" ADD CONSTRAINT "LeaderboardMatch_entryBId_fkey" FOREIGN KEY ("entryBId") REFERENCES "LeaderboardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardMatch" ADD CONSTRAINT "LeaderboardMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "LeaderboardEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
