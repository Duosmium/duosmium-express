/*
  Warnings:

  - You are about to drop the column `location` on the `results` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "events_result_duosmium_id_name_key";

-- DropIndex
DROP INDEX "penalties_result_duosmium_id_team_number_key";

-- DropIndex
DROP INDEX "placings_result_duosmium_id_event_name_team_number_key";

-- DropIndex
DROP INDEX "results_duosmium_id_index";

-- DropIndex
DROP INDEX "teams_result_duosmium_id_number_key";

-- DropIndex
DROP INDEX "tracks_result_duosmium_id_name_key";

-- AlterTable
ALTER TABLE "results" DROP COLUMN "location";
