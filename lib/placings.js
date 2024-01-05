const { prisma } = require("./global");

async function getPlacing(duosmiumID, event_name, teamNumber) {
  return prisma.placing.findUniqueOrThrow({
    where: {
      result_duosmium_id_event_name_team_number: {
        result_duosmium_id: duosmiumID,
        event_name: event_name,
        team_number: teamNumber,
      },
    },
  });
}

async function getPlacingData(duosmiumID) {
  const rawData = await prisma.placing.findMany({
    where: {
      result_duosmium_id: duosmiumID,
    },
    orderBy: [
      {
        team_number: "asc",
      },
      {
        event_name: "asc",
      },
    ],
  });
  return rawData.map((i) => i.data);
}

async function placingExists(duosmiumID, event_name, teamNumber) {
  return (
    (await prisma.placing.count({
      where: {
        result_duosmium_id: duosmiumID,
        event_name: event_name,
        team_number: teamNumber,
      },
    })) > 0
  );
}

async function deletePlacing(duosmiumID, event_name, teamNumber) {
  return prisma.placing.delete({
    where: {
      result_duosmium_id_event_name_team_number: {
        result_duosmium_id: duosmiumID,
        event_name: event_name,
        team_number: teamNumber,
      },
    },
  });
}

async function deleteAllPlacings() {
  return prisma.placing.deleteMany({});
}

async function addPlacing(placingData) {
  return prisma.placing.upsert({
    where: {
      result_duosmium_id_event_name_team_number: {
        result_duosmium_id: placingData.result_duosmium_id,
        event_name: placingData.event_name,
        team_number: placingData.team_number,
      },
    },
    create: placingData,
    update: placingData,
  });
}

async function createPlacingDataInput(placing, duosmiumID) {
  return {
    event: {
      connect: {
        result_duosmium_id_name: {
          result_duosmium_id: duosmiumID,
          name: placing.event.name,
        },
      },
    },
    team: {
      connect: {
        result_duosmium_id_number: {
          result_duosmium_id: duosmiumID,
          number: placing.team.number,
        },
      },
    },
    data: placing.rep,
  };
}

module.exports = {
  addPlacing,
  deletePlacing,
  deleteAllPlacings,
  createPlacingDataInput,
  getPlacing,
  placingExists,
  getPlacingData,
};
