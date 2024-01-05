const { prisma } = require("./global");

async function getEvent(duosmiumID, eventName) {
  return prisma.event.findUniqueOrThrow({
    where: {
      result_duosmium_id_name: {
        result_duosmium_id: duosmiumID,
        name: eventName,
      },
    },
  });
}

async function getEventData(duosmiumID) {
  const rawData = await prisma.event.findMany({
    where: {
      result_duosmium_id: duosmiumID,
    },
    select: {
      data: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return rawData.map((i) => i.data);
}

async function eventExists(duosmiumID, eventName) {
  return (
    (await prisma.event.count({
      where: {
        result_duosmium_id: duosmiumID,
        name: eventName,
      },
    })) > 0
  );
}

async function deleteEvent(duosmiumID, eventName) {
  return prisma.event.delete({
    where: {
      result_duosmium_id_name: {
        result_duosmium_id: duosmiumID,
        name: eventName,
      },
    },
  });
}

async function deleteAllEvents() {
  return prisma.event.deleteMany({});
}

async function addEvent(resultEventData) {
  return prisma.event.upsert({
    where: {
      result_duosmium_id_name: {
        result_duosmium_id: resultEventData.result_duosmium_id,
        name: resultEventData.name,
      },
    },
    create: resultEventData,
    update: resultEventData,
  });
}

async function createEventDataInput(event) {
  return {
    name: event.name,
    data: event.rep,
  };
}

module.exports = {
  getEvent,
  addEvent,
  createEventDataInput,
  deleteEvent,
  deleteAllEvents,
  getEventData,
  eventExists,
};
