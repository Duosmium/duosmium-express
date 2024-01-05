const { prisma } = require("./global");
const { ordinalize, STATES_BY_POSTAL_CODE } = require("./global");

async function getTeam(duosmiumID, number) {
  return prisma.team.findUniqueOrThrow({
    where: {
      result_duosmium_id_number: {
        result_duosmium_id: duosmiumID,
        number,
      },
    },
  });
}

async function getTeamData(duosmiumID) {
  const rawData = await prisma.team.findMany({
    where: {
      result_duosmium_id: duosmiumID,
    },
    orderBy: {
      number: "asc",
    },
    select: {
      data: true,
    },
  });
  return rawData.map((i) => i.data);
}

async function teamExists(duosmiumID, number) {
  return (
    (await prisma.team.count({
      where: {
        result_duosmium_id: duosmiumID,
        number,
      },
    })) > 0
  );
}

async function deleteTeam(duosmiumID, number) {
  return prisma.team.delete({
    where: {
      result_duosmium_id_number: {
        result_duosmium_id: duosmiumID,
        number,
      },
    },
  });
}

async function deleteAllTeams() {
  return prisma.team.deleteMany({});
}

async function addTeam(teamData) {
  return prisma.team.upsert({
    where: {
      result_duosmium_id_number: {
        result_duosmium_id: teamData.result_duosmium_id,
        number: teamData.number,
      },
    },
    create: teamData,
    update: teamData,
  });
}

async function createTeamDataInput(team) {
  return {
    number: team.number,
    data: team.rep,
    rank: team.rank,
    track_rank: team.trackRank === undefined ? null : team.trackRank,
    name: team.school,
    city: team.city ? team.city : "",
    state: team.state in STATES_BY_POSTAL_CODE ? team.state : "",
    country: team.state in STATES_BY_POSTAL_CODE ? "United States" : team.state,
  };
}

async function getTournamentsPerSchool(letter = undefined) {
  const allTeams = await prisma.team.findMany({
    select: {
      name: true,
      city: true,
      state: true,
      country: true,
      rank: true,
      result: {
        select: {
          title: true,
          duosmium_id: true,
        },
      },
    },
    orderBy: [
      {
        name: "asc",
      },
      {
        city: "asc",
      },
      {
        state: "asc",
      },
      {
        country: "asc",
      },
      {
        result_duosmium_id: "desc",
      },
      {
        rank: "asc",
      },
    ],
    where: {
      name: {
        startsWith: letter,
        mode: "insensitive",
      },
    },
  });
  const rankMap = new Map();
  const tournamentNames = new Map();
  for (const team of allTeams) {
    const teamStr = `${team.name} (${
      team.city ? `${team.city}, ${team.state}` : `${team.state}`
    })`;
    if (!rankMap.has(teamStr)) {
      rankMap.set(teamStr, new Map());
    }
    const tournamentInfo = [team.result.duosmium_id, team.result.title];
    if (!rankMap.get(teamStr)?.has(tournamentInfo[0])) {
      rankMap.get(teamStr)?.set(tournamentInfo[0], []);
    }
    rankMap.get(teamStr)?.get(tournamentInfo[0])?.push(ordinalize(team.rank));
    if (!tournamentNames.has(tournamentInfo[0])) {
      tournamentNames.set(tournamentInfo[0], tournamentInfo[1]);
    }
  }
  return [rankMap, tournamentNames];
}

async function getFirstLetter() {
  // https://github.com/prisma/prisma/issues/5068 -- this sort should be case-insensitive but isn't
  // until it is, we'll use a different (slower) method to avoid edge cases (e.g. the first letter being D for duPont)
  return (
    await prisma.team.findMany({
      distinct: ["name"],
      select: {
        name: true,
      },
    })
  )
    .map((t) => t.name.toLowerCase()[0])
    .sort()[0];
}

async function getAllFirstLetters() {
  const teamNames = await prisma.team.findMany({
    distinct: ["name"],
    select: {
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  const letters = [];
  const letterSet = new Set();
  for (const team of teamNames) {
    const lowerLetter = team.name[0].toLowerCase();
    if (!letterSet.has(lowerLetter)) {
      letters.push(lowerLetter);
      letterSet.add(lowerLetter);
    }
  }
  return letters;
}
