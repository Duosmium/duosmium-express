-- AlterTable
ALTER TABLE "events" RENAME CONSTRAINT "events_result_duosmium_id_name" TO "events_pkey";

-- AlterTable
ALTER TABLE "penalties" RENAME CONSTRAINT "penalties_result_duosmium_id_team_number" TO "penalties_pkey";

-- AlterTable
ALTER TABLE "placings" RENAME CONSTRAINT "placings_result_duosmium_id_event_name_team_number" TO "placings_pkey";

-- AlterTable
ALTER TABLE "teams" RENAME CONSTRAINT "teams_result_duosmium_id_number" TO "teams_pkey";

-- AlterTable
ALTER TABLE "tracks" RENAME CONSTRAINT "tracks_result_duosmium_id_name" TO "tracks_pkey";

-- RenameForeignKey
ALTER TABLE "events" RENAME CONSTRAINT "events_result_duosmium_id_results_duosmium_id_fk" TO "events_result_duosmium_id_fkey";

-- RenameForeignKey
ALTER TABLE "histograms" RENAME CONSTRAINT "histograms_result_duosmium_id_results_duosmium_id_fk" TO "histograms_result_duosmium_id_fkey";

-- RenameForeignKey
ALTER TABLE "penalties" RENAME CONSTRAINT "penalties_result_duosmium_id_results_duosmium_id_fk" TO "penalties_result_duosmium_id_fkey";

-- RenameForeignKey
ALTER TABLE "placings" RENAME CONSTRAINT "placings_result_duosmium_id_results_duosmium_id_fk" TO "placings_result_duosmium_id_fkey";

-- RenameForeignKey
ALTER TABLE "teams" RENAME CONSTRAINT "teams_result_duosmium_id_results_duosmium_id_fk" TO "teams_result_duosmium_id_fkey";

-- RenameForeignKey
ALTER TABLE "tournaments" RENAME CONSTRAINT "tournaments_result_duosmium_id_results_duosmium_id_fk" TO "tournaments_result_duosmium_id_fkey";

-- RenameForeignKey
ALTER TABLE "tracks" RENAME CONSTRAINT "tracks_result_duosmium_id_results_duosmium_id_fk" TO "tracks_result_duosmium_id_fkey";

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_team_number_result_duosmium_id_fkey" FOREIGN KEY ("team_number", "result_duosmium_id") REFERENCES "teams"("number", "result_duosmium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placings" ADD CONSTRAINT "placings_event_name_result_duosmium_id_fkey" FOREIGN KEY ("event_name", "result_duosmium_id") REFERENCES "events"("name", "result_duosmium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placings" ADD CONSTRAINT "placings_team_number_result_duosmium_id_fkey" FOREIGN KEY ("team_number", "result_duosmium_id") REFERENCES "teams"("number", "result_duosmium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "events_result_duosmium_id_name_index" RENAME TO "events_result_duosmium_id_name_key";

-- RenameIndex
ALTER INDEX "histograms_result_duosmium_id_index" RENAME TO "histograms_result_duosmium_id_key";

-- RenameIndex
ALTER INDEX "penalties_result_duosmium_id_team_number_index" RENAME TO "penalties_result_duosmium_id_team_number_key";

-- RenameIndex
ALTER INDEX "placings_result_duosmium_id_event_name_team_number_index" RENAME TO "placings_result_duosmium_id_event_name_team_number_key";

-- RenameIndex
ALTER INDEX "teams_result_duosmium_id_number_index" RENAME TO "teams_result_duosmium_id_number_key";

-- RenameIndex
ALTER INDEX "tournaments_result_duosmium_id_index" RENAME TO "tournaments_result_duosmium_id_key";

-- RenameIndex
ALTER INDEX "tracks_result_duosmium_id_name_index" RENAME TO "tracks_result_duosmium_id_name_key";
