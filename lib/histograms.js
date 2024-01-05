const { prisma } = require("./global");

async function getHistogram(duosmiumID) {
  return await prisma.histogram.findUniqueOrThrow({
    where: {
      result_duosmium_id: duosmiumID,
    },
  });
}

async function getHistogramData(duosmiumID) {
  const rawData = await prisma.histogram.findUnique({
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

async function histogramExists(duosmiumID) {
  return (
    (await prisma.histogram.count({
      where: {
        result_duosmium_id: duosmiumID,
      },
    })) > 0
  );
}

async function deleteHistogram(duosmiumID) {
  return await prisma.histogram.delete({
    where: {
      result_duosmium_id: duosmiumID,
    },
  });
}

async function deleteAllHistograms() {
  return await prisma.histogram.deleteMany({});
}

async function addHistogram(histogramData) {
  return await prisma.histogram.upsert({
    where: {
      result_duosmium_id: histogramData.result_duosmium_id,
    },
    create: histogramData,
    update: histogramData,
  });
}

async function createHistogramDataInput(histogram) {
  return {
    data: histogram.rep,
  };
}

module.exports = {
  addHistogram,
  deleteHistogram,
  deleteAllHistograms,
  createHistogramDataInput,
  getHistogram,
  getHistogramData,
  histogramExists,
};
