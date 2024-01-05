-- CreateTable
CREATE TABLE "events" (
    "name" TEXT NOT NULL,
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "events_result_duosmium_id_name" PRIMARY KEY ("result_duosmium_id","name")
);

-- CreateTable
CREATE TABLE "histograms" (
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "histograms_pkey" PRIMARY KEY ("result_duosmium_id")
);

-- CreateTable
CREATE TABLE "penalties" (
    "team_number" INTEGER NOT NULL,
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "penalties_result_duosmium_id_team_number" PRIMARY KEY ("result_duosmium_id","team_number")
);

-- CreateTable
CREATE TABLE "placings" (
    "event_name" TEXT NOT NULL,
    "team_number" INTEGER NOT NULL,
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "placings_result_duosmium_id_event_name_team_number" PRIMARY KEY ("result_duosmium_id","event_name","team_number")
);

-- CreateTable
CREATE TABLE "results" (
    "duosmium_id" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "preliminary" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "full_title" TEXT NOT NULL,
    "short_title" TEXT NOT NULL,
    "full_short_title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_city" TEXT NOT NULL DEFAULT '',
    "location_state" TEXT NOT NULL,
    "location_country" TEXT NOT NULL DEFAULT 'United States',

    CONSTRAINT "results_pkey" PRIMARY KEY ("duosmium_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "number" INTEGER NOT NULL,
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'United States',
    "track" TEXT,
    "rank" INTEGER NOT NULL,
    "track_rank" INTEGER,

    CONSTRAINT "teams_result_duosmium_id_number" PRIMARY KEY ("result_duosmium_id","number")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("result_duosmium_id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "name" TEXT NOT NULL,
    "result_duosmium_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "tracks_result_duosmium_id_name" PRIMARY KEY ("result_duosmium_id","name")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_result_duosmium_id_name_index" ON "events"("result_duosmium_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "histograms_result_duosmium_id_index" ON "histograms"("result_duosmium_id");

-- CreateIndex
CREATE UNIQUE INDEX "penalties_result_duosmium_id_team_number_index" ON "penalties"("result_duosmium_id", "team_number");

-- CreateIndex
CREATE UNIQUE INDEX "placings_result_duosmium_id_event_name_team_number_index" ON "placings"("result_duosmium_id", "event_name", "team_number");

-- CreateIndex
CREATE UNIQUE INDEX "results_duosmium_id_index" ON "results"("duosmium_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_result_duosmium_id_number_index" ON "teams"("result_duosmium_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_result_duosmium_id_index" ON "tournaments"("result_duosmium_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_result_duosmium_id_name_index" ON "tracks"("result_duosmium_id", "name");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "histograms" ADD CONSTRAINT "histograms_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placings" ADD CONSTRAINT "placings_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_result_duosmium_id_results_duosmium_id_fk" FOREIGN KEY ("result_duosmium_id") REFERENCES "results"("duosmium_id") ON DELETE CASCADE ON UPDATE CASCADE;
