/*
  Warnings:

  - The primary key for the `SeriesMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `SeriesMember` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SeriesMember_seriesId_userId_key";

-- AlterTable
ALTER TABLE "SeriesMember" DROP CONSTRAINT "SeriesMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "SeriesMember_pkey" PRIMARY KEY ("seriesId", "userId");
