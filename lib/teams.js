const { prisma, redisClient } = require("./global");
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
  if (redisClient) {
    const cachedLength = await redisClient.ZCARD("schoolLetters");
    if (cachedLength > 0) {
      return await redisClient.ZRANGE(
        "schoolLetters",
        0,
        cachedLength - 1,
        "BYLEX",
      );
    }
  }
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
  if (redisClient) {
    for (const letter of letters) {
      await redisClient.ZADD("schoolLetters", { score: "1.0", value: letter });
    }
  }
  return letters;
}

async function getSchoolRankings(name, city, state, country) {
  const prefix = `rankings:${country}:${state}:${city}:${name}`;
  let tournaments = [];
  let savedInCache = true;
  if (redisClient) {
    tournaments = await redisClient.ZRANGE(prefix, 0, -1, { REV: true });
    if (tournaments.length === 0) {
      savedInCache = false;
    } else {
      for (const tournament of tournaments) {
        if ((await redisClient.ZCARD(`${prefix}:${tournament}`)) === 0) {
          savedInCache = false;
          break;
        }
      }
    }
    if (savedInCache) {
      const output = {};
      for (const tournament of tournaments) {
        output[tournament] = (
          await redisClient.ZRANGE(`${prefix}:${tournament}`, 0, -1)
        ).map((r) => Number(r));
      }
      return output;
    }
  }
  const output = {};
  const teams = await prisma.team.findMany({
    select: {
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
        result_duosmium_id: "desc",
      },
      {
        rank: "asc",
      },
    ],
    where: {
      name: name,
      city: city,
      state: state,
      country: country,
    },
  });
  if (teams.length === 0) {
    throw new Error("This is not a real school!");
  }
  for (const team of teams) {
    if (!(team.result.duosmium_id in output)) {
      output[team.result.duosmium_id] = [];
    }
    output[team.result.duosmium_id].push(team.rank);
  }
  if (redisClient) {
    for (const tournament of Object.keys(output)) {
      await redisClient.ZADD(prefix, { score: "1.0", value: tournament });
      for (const rank of output[tournament]) {
        await redisClient.ZADD(`${prefix}:${tournament}`, {
          score: rank.toString(),
          value: rank.toString(),
        });
      }
    }
  }
  return output;
}

async function getSchoolRankingsCombinedName(name) {
  const [school, city, state, country] = unformatSchool(name);
  return await getSchoolRankings(school, city, state, country);
}

async function getAllRankingsByLetter(letter) {
  letter = letter.toLowerCase();
  const firstLetters = await getAllFirstLetters();
  if (firstLetters.indexOf(letter) === -1) {
    throw new Error("No results!");
  }
  if (redisClient) {
    const schools = await redisClient.ZRANGE(
      `schools:letters:${letter}`,
      0,
      -1,
    );
    if (schools.length > 0) {
      const output = {};
      for (const school of schools) {
        output[school] = await getSchoolRankingsCombinedName(school);
      }
      return output;
    }
  }
  // TODO: finish this method
  const allTeams = (
    await prisma.team.findMany({
      select: {
        name: true,
        city: true,
        state: true,
        country: true,
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
      ],
      where: {
        name: {
          startsWith: letter,
          mode: "insensitive",
        },
      },
    })
  )
    .map((team) => formatSchool(team.name, team.city, team.state, team.country))
    .sort();
  const output = {};
  for (const team of allTeams) {
    if (!(team in output)) {
      output[team] = await getSchoolRankingsCombinedName(team);
    }
  }
  if (redisClient) {
    for (const team of allTeams) {
      await redisClient.ZADD(`schools:letters:${letter}`, {
        score: "1.0",
        value: team,
      });
    }
  }

  return output;
}

function formatSchool(name, city, state, country) {
  return `${name} (${
    city ? `${city}, ${state ? state : country}` : `${state ? state : country}`
  })`;
}

function unformatSchool(name) {
  const schoolRegex = /^(.+) \(((.+), )?(\w+)\)$/;
  if (!schoolRegex.test(name)) {
    throw Error(`${name} is not a valid school name!`);
  }
  const matches = name.match(schoolRegex);
  return [
    matches[1],
    matches[3] ?? "",
    matches[4] in STATES_BY_POSTAL_CODE ? matches[4] : "",
    matches[4] in STATES_BY_POSTAL_CODE ? "United States" : matches[4],
  ];
}

module.exports = {
  getTeam,
  getAllFirstLetters,
  addTeam,
  deleteTeam,
  deleteAllTeams,
  getFirstLetter,
  getTournamentsPerSchool,
  createTeamDataInput,
  getSchoolRankingsCombinedName,
  getAllRankingsByLetter,
};
