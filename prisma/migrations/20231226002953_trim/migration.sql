/*
  Warnings:

  - You are about to drop the column `color` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `full_short_title` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `full_title` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `location_city` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `location_country` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `location_name` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `location_state` on the `results` table. All the data in the column will be lost.
  - You are about to drop the column `track` on the `teams` table. All the data in the column will be lost.
  - You are about to drop the `histograms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tournaments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `location` to the `results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournament` to the `results` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "histograms" DROP CONSTRAINT "histograms_result_duosmium_id_fkey";

-- DropForeignKey
ALTER TABLE "tournaments" DROP CONSTRAINT "tournaments_result_duosmium_id_fkey";

-- AlterTable
ALTER TABLE "results" DROP COLUMN "color",
DROP COLUMN "full_short_title",
DROP COLUMN "full_title",
DROP COLUMN "location_city",
DROP COLUMN "location_country",
DROP COLUMN "location_name",
DROP COLUMN "location_state",
ADD COLUMN     "histogram" JSONB,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "tournament" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "teams" DROP COLUMN "track",
ADD COLUMN     "track_name" TEXT;

-- DropTable
DROP TABLE "histograms";

-- DropTable
DROP TABLE "tournaments";

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_result_duosmium_id_track_name_fkey" FOREIGN KEY ("result_duosmium_id", "track_name") REFERENCES "tracks"("result_duosmium_id", "name") ON DELETE RESTRICT ON UPDATE CASCADE;
