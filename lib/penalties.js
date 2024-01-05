const { prisma } = require("./global");

async function getPenalty(duosmiumID, teamNumber) {
  return prisma.penalty.findUniqueOrThrow({
    where: {
      result_duosmium_id_team_number: {
        result_duosmium_id: duosmiumID,
        team_number: teamNumber,
      },
    },
  });
}

async function getPenaltyData(duosmiumID) {
  const rawData = await prisma.penalty.findMany({
    where: {
      result_duosmium_id: duosmiumID,
    },
    orderBy: {
      team_number: "asc",
    },
    select: {
      data: true,
    },
  });
  return rawData.map((i) => i.data);
}

async function penaltyExists(duosmiumID, teamNumber) {
  return (
    (await prisma.penalty.count({
      where: {
        result_duosmium_id: duosmiumID,
        team_number: teamNumber,
      },
    })) > 0
  );
}

async function deletePenalty(duosmiumID, teamNumber) {
  return prisma.penalty.delete({
    where: {
      result_duosmium_id_team_number: {
        result_duosmium_id: duosmiumID,
        team_number: teamNumber,
      },
    },
  });
}

async function deleteAllPenalties() {
  return prisma.penalty.deleteMany({});
}

async function addPenalty(penaltyData) {
  return prisma.penalty.upsert({
    where: {
      result_duosmium_id_team_number: {
        result_duosmium_id: penaltyData.result_duosmium_id,
        team_number: penaltyData.team_number,
      },
    },
    create: penaltyData,
    update: penaltyData,
  });
}

async function createPenaltyDataInput(penalty, duosmiumID) {
  return {
    team: {
      connect: {
        result_duosmium_id_number: {
          result_duosmium_id: duosmiumID,
          number: penalty.team.number,
        },
      },
    },
    data: penalty.rep,
  };
}

module.exports = {
  addPenalty,
  deletePenalty,
  deleteAllPenalties,
  getPenalty,
  createPenaltyDataInput,
  getPenaltyData,
  penaltyExists,
};
