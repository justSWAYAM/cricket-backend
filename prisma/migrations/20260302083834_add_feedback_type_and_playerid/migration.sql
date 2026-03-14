-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "playerId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'report';
