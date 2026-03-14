/*
  Warnings:

  - You are about to drop the column `foundedYear` on the `IPLTeam` table. All the data in the column will be lost.
  - You are about to drop the column `shortName` on the `IPLTeam` table. All the data in the column will be lost.
  - You are about to drop the column `battingStyle` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `bowlingStyle` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `seasonsCount` on the `PlayerIPLTeam` table. All the data in the column will be lost.
  - You are about to drop the `IPLSeason` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InternationalStat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlayerIPLStat` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `IPLTeam` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `IPLTeam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationality` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "IPLSeason" DROP CONSTRAINT "IPLSeason_playerOfTournamentId_fkey";

-- DropForeignKey
ALTER TABLE "IPLSeason" DROP CONSTRAINT "IPLSeason_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "InternationalStat" DROP CONSTRAINT "InternationalStat_playerId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerIPLStat" DROP CONSTRAINT "PlayerIPLStat_playerId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerIPLStat" DROP CONSTRAINT "PlayerIPLStat_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerIPLStat" DROP CONSTRAINT "PlayerIPLStat_teamId_fkey";

-- DropIndex
DROP INDEX "IPLTeam_shortName_key";

-- AlterTable
ALTER TABLE "IPLTeam" DROP COLUMN "foundedYear",
DROP COLUMN "shortName",
ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "battingStyle",
DROP COLUMN "bowlingStyle",
DROP COLUMN "country",
DROP COLUMN "dateOfBirth",
DROP COLUMN "imageUrl",
DROP COLUMN "role",
ADD COLUMN     "nationality" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PlayerIPLTeam" DROP COLUMN "seasonsCount";

-- DropTable
DROP TABLE "IPLSeason";

-- DropTable
DROP TABLE "InternationalStat";

-- DropTable
DROP TABLE "PlayerIPLStat";

-- CreateIndex
CREATE UNIQUE INDEX "IPLTeam_code_key" ON "IPLTeam"("code");
