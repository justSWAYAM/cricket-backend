/*
  Warnings:

  - A unique constraint covering the columns `[shortName]` on the table `IPLTeam` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "IPLTeam_shortName_key" ON "IPLTeam"("shortName");
