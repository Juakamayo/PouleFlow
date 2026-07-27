-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'MIXED');

-- CreateEnum
CREATE TYPE "WeaponName" AS ENUM ('EPEE', 'FOIL', 'SABER');

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "iocCode" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fencer" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "clubId" INTEGER,
    "countryId" INTEGER NOT NULL,
    "nationalRank" INTEGER,
    "internationalRank" INTEGER,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Fencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referee" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" SERIAL NOT NULL,
    "name" "WeaponName" NOT NULL,

    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "fencerId" INTEGER NOT NULL,
    "seedRank" INTEGER,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "poolNumber" INTEGER NOT NULL,
    "pisteNumber" INTEGER,
    "refereeId" INTEGER,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolAssignment" (
    "id" SERIAL NOT NULL,
    "poolId" INTEGER NOT NULL,
    "fencerId" INTEGER NOT NULL,

    CONSTRAINT "PoolAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolBout" (
    "id" SERIAL NOT NULL,
    "poolId" INTEGER NOT NULL,
    "fencerAId" INTEGER NOT NULL,
    "fencerBId" INTEGER NOT NULL,
    "scoreA" INTEGER NOT NULL,
    "scoreB" INTEGER NOT NULL,

    CONSTRAINT "PoolBout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tableau" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "Tableau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketMatch" (
    "id" SERIAL NOT NULL,
    "tableauId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "fencerAId" INTEGER,
    "fencerBId" INTEGER,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "refereeId" INTEGER,

    CONSTRAINT "BracketMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_iocCode_key" ON "Country"("iocCode");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_countryId_key" ON "Club"("name", "countryId");

-- CreateIndex
CREATE INDEX "Fencer_lastName_firstName_idx" ON "Fencer"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Weapon_name_key" ON "Weapon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Event_tournamentId_weaponId_categoryId_gender_key" ON "Event"("tournamentId", "weaponId", "categoryId", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_fencerId_key" ON "Registration"("eventId", "fencerId");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_eventId_poolNumber_key" ON "Pool"("eventId", "poolNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PoolAssignment_poolId_fencerId_key" ON "PoolAssignment"("poolId", "fencerId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolBout_poolId_fencerAId_fencerBId_key" ON "PoolBout"("poolId", "fencerAId", "fencerBId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketMatch_tableauId_round_position_key" ON "BracketMatch"("tableauId", "round", "position");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fencer" ADD CONSTRAINT "Fencer_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fencer" ADD CONSTRAINT "Fencer_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_fencerId_fkey" FOREIGN KEY ("fencerId") REFERENCES "Fencer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAssignment" ADD CONSTRAINT "PoolAssignment_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAssignment" ADD CONSTRAINT "PoolAssignment_fencerId_fkey" FOREIGN KEY ("fencerId") REFERENCES "Fencer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolBout" ADD CONSTRAINT "PoolBout_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolBout" ADD CONSTRAINT "PoolBout_fencerAId_fkey" FOREIGN KEY ("fencerAId") REFERENCES "Fencer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolBout" ADD CONSTRAINT "PoolBout_fencerBId_fkey" FOREIGN KEY ("fencerBId") REFERENCES "Fencer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tableau" ADD CONSTRAINT "Tableau_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_tableauId_fkey" FOREIGN KEY ("tableauId") REFERENCES "Tableau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_fencerAId_fkey" FOREIGN KEY ("fencerAId") REFERENCES "Fencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_fencerBId_fkey" FOREIGN KEY ("fencerBId") REFERENCES "Fencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
