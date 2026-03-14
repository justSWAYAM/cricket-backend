-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "battingStyle" TEXT,
    "bowlingStyle" TEXT,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPLTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "foundedYear" INTEGER,

    CONSTRAINT "IPLTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPLSeason" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "winnerId" TEXT,
    "playerOfTournamentId" TEXT,

    CONSTRAINT "IPLSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerIPLStat" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "manOfTheMatches" INTEGER NOT NULL DEFAULT 0,
    "highestScore" INTEGER,
    "battingAverage" DOUBLE PRECISION,
    "bowlingAverage" DOUBLE PRECISION,
    "economy" DOUBLE PRECISION,

    CONSTRAINT "PlayerIPLStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerIPLTeam" (
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonsCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerIPLTeam_pkey" PRIMARY KEY ("playerId","teamId")
);

-- CreateTable
CREATE TABLE "InternationalStat" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "manOfTheMatches" INTEGER NOT NULL DEFAULT 0,
    "highestScore" INTEGER,
    "battingAverage" DOUBLE PRECISION,
    "bowlingAverage" DOUBLE PRECISION,
    "economy" DOUBLE PRECISION,

    CONSTRAINT "InternationalStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IPLSeason_year_key" ON "IPLSeason"("year");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerIPLStat_playerId_teamId_seasonId_key" ON "PlayerIPLStat"("playerId", "teamId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalStat_playerId_format_key" ON "InternationalStat"("playerId", "format");

-- AddForeignKey
ALTER TABLE "IPLSeason" ADD CONSTRAINT "IPLSeason_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "IPLTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPLSeason" ADD CONSTRAINT "IPLSeason_playerOfTournamentId_fkey" FOREIGN KEY ("playerOfTournamentId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerIPLStat" ADD CONSTRAINT "PlayerIPLStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerIPLStat" ADD CONSTRAINT "PlayerIPLStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "IPLTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerIPLStat" ADD CONSTRAINT "PlayerIPLStat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "IPLSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerIPLTeam" ADD CONSTRAINT "PlayerIPLTeam_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerIPLTeam" ADD CONSTRAINT "PlayerIPLTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "IPLTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalStat" ADD CONSTRAINT "InternationalStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
