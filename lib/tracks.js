const { prisma } = require("./global");

async function getTrack(duosmiumID, name) {
  return await prisma.track.findUniqueOrThrow({
    where: {
      result_duosmium_id_name: {
        result_duosmium_id: duosmiumID,
        name: name.toString(),
      },
    },
  });
}

async function getTrackData(duosmiumID) {
  const rawData = await prisma.track.findMany({
    where: {
      result_duosmium_id: duosmiumID,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      data: true,
    },
  });
  return rawData.map((i) => i.data);
}

async function trackExists(duosmiumID, name) {
  return (
    (await prisma.track.count({
      where: {
        result_duosmium_id: duosmiumID,
        name: name.toString(),
      },
    })) > 0
  );
}

async function deleteTrack(duosmiumID, name) {
  return prisma.track.delete({
    where: {
      result_duosmium_id_name: {
        result_duosmium_id: duosmiumID,
        name: name.toString(),
      },
    },
  });
}

async function deleteAllTracks() {
  return prisma.track.deleteMany({});
}

async function addTrack(trackData) {
  return prisma.track.upsert({
    where: {
      result_duosmium_id_name: {
        result_duosmium_id: trackData.result_duosmium_id,
        name: trackData.name.toString(),
      },
    },
    create: trackData,
    update: trackData,
  });
}

async function createTrackDataInput(track) {
  return {
    name: track.name.toString(),
    data: track.rep,
  };
}

module.exports = {
  createTrackDataInput,
  addTrack,
  deleteTrack,
  deleteAllTracks,
  getTrack,
  trackExists,
};
