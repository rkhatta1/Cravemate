-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "sharedEntryId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedEntryId_fkey" FOREIGN KEY ("sharedEntryId") REFERENCES "LeaderboardEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
