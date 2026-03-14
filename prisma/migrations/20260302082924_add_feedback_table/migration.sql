-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
