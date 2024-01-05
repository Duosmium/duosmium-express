const { prisma } = require("./global");

async function getTournament(duosmiumID) {
  return await prisma.tournament.findUniqueOrThrow({
    where: {
      result_duosmium_id: duosmiumID,
    },
  });
}

async function getTournamentData(duosmiumID) {
  const rawData = await prisma.tournament.findUnique({
    where: {
      result_duosmium_id: duosmiumID,
    },
  });
  if (rawData === null) {
    return null;
  } else {
    return rawData.data;
  }
}

async function tournamentExists(duosmiumID) {
  return (
    (await prisma.tournament.count({
      where: {
        result_duosmium_id: duosmiumID,
      },
    })) > 0
  );
}

async function deleteTournament(duosmiumID) {
  return await prisma.tournament.delete({
    where: {
      result_duosmium_id: duosmiumID,
    },
  });
}

async function deleteAllTournaments() {
  return await prisma.tournament.deleteMany({});
}

async function addTournament(tournamentData) {
  return await prisma.tournament.upsert({
    where: {
      result_duosmium_id: tournamentData.result_duosmium_id,
    },
    create: tournamentData,
    update: tournamentData,
  });
}

async function createTournamentDataInput(tournament) {
  return {
    data: tournament.rep,
  };
}

async function getAllTournamentsByLevel(level) {
  return await prisma.tournament.findMany({
    where: {
      data: {
        path: ["level"],
        equals: level,
      },
    },
  });
}

async function countAllTournamentsByLevel(level) {
  return await prisma.tournament.count({
    where: {
      data: {
        path: ["level"],
        equals: level,
      },
    },
  });
}
