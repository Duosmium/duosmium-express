const { createEventDataInput } = require("./events");
const { createPenaltyDataInput } = require("./penalties");
const { createPlacingDataInput } = require("./placings");
const { createTeamDataInput } = require("./teams");
const { createTrackDataInput } = require("./tracks");
const { load, dump } = require("js-yaml");
const {
  prisma,
  supabase,
  JSON_OPTIONS,
  STATES_BY_POSTAL_CODE,
  YAML_OPTIONS,
  redisClient,
} = require("./global");
const {
  colorOrder,
  colors,
  darkColorOrder,
  defaultColor,
  getColor,
  getFullName,
  getNumber,
  trophyAndMedalColors,
} = require("./colors");
const { ContrastChecker } = require("color-contrast-calc");
const Vibrant = require("node-vibrant");
const nearestColor = require("nearest-color");
const Interpreter = import("sciolyff/interpreter").then((res) => {
  return res;
});

async function getResult(duosmiumID) {
  if (redisClient) {
    const objLen = await redisClient.json.OBJLEN(`meta:${duosmiumID}`);
    if (objLen > 0) {
      return await redisClient.json.GET(`meta:${duosmiumID}`, "$");
    }
  }
  const output = prisma.result.findUniqueOrThrow({
    where: {
      duosmium_id: duosmiumID,
    },
  });
  if (redisClient) {
    await redisClient.json.SET(`meta:${duosmiumID}`, "$", output);
  }
  return output;
}

async function getCompleteResultData(duosmiumID) {
  const [resultData, eventData, trackData, teamData, placingData, penaltyData] =
    await prisma.$transaction([
      prisma.result.findUnique({
        where: {
          duosmium_id: duosmiumID,
        },
        select: {
          tournament: true,
          histogram: true,
        },
      }),
      prisma.event.findMany({
        where: {
          result_duosmium_id: duosmiumID,
        },
        select: {
          data: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.track.findMany({
        where: {
          result_duosmium_id: duosmiumID,
        },
        select: {
          data: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.team.findMany({
        where: {
          result_duosmium_id: duosmiumID,
        },
        orderBy: {
          number: "asc",
        },
        select: {
          data: true,
        },
      }),
      prisma.placing.findMany({
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
        select: {
          data: true,
        },
      }),
      prisma.penalty.findMany({
        where: {
          result_duosmium_id: duosmiumID,
        },
        orderBy: {
          team_number: "asc",
        },
        select: {
          data: true,
        },
      }),
    ]);
  return [
    resultData.tournament,
    eventData,
    trackData,
    teamData,
    placingData,
    penaltyData,
    resultData.histogram,
  ];
}

async function getCompleteResult(duosmiumID) {
  if (redisClient) {
    const objLen = await redisClient.json.OBJLEN(`complete:${duosmiumID}`);
    if (objLen > 0) {
      return await redisClient.json.GET(`complete:${duosmiumID}`, "$");
    }
  }
  const [
    tournamentData,
    eventData,
    trackData,
    teamData,
    placingData,
    penaltyData,
    histogramData,
  ] = await getCompleteResultData(duosmiumID);
  const output = {};
  if (tournamentData !== null) {
    output["Tournament"] = tournamentData;
  }
  if (eventData.length > 0) {
    output["Events"] = eventData.map((i) => i.data);
  }
  if (trackData.length > 0) {
    output["Tracks"] = trackData.map((i) => i.data);
  }
  if (teamData.length > 0) {
    output["Teams"] = teamData.map((i) => i.data);
  }
  if (placingData.length > 0) {
    output["Placings"] = placingData.map((i) => i.data);
  }
  if (penaltyData.length > 0) {
    output["Penalties"] = penaltyData.map((i) => i.data);
  }
  if (histogramData) {
    output["Histograms"] = histogramData;
  }
  if (redisClient) {
    redisClient.json.SET(`complete:${duosmiumID}`, "$", output);
  }
  return output;
}

async function getAllResults(ascending = true, limit = 0) {
  return prisma.result.findMany({
    orderBy: [
      {
        duosmium_id: ascending ? "asc" : "desc",
      },
    ],
    take: limit === 0 ? undefined : limit,
  });
}

async function getAllCompleteResults(ascending = true, limit = 0) {
  const output = {};
  for (const result of await getAllResults(ascending, limit)) {
    const duosmiumID = result.duosmium_id;
    output[duosmiumID] = await getCompleteResult(duosmiumID);
  }
  return output;
}

async function resultExists(duosmiumID) {
  return (
    (await prisma.result.count({
      where: {
        duosmium_id: duosmiumID,
      },
    })) > 0
  );
}

async function deleteResult(duosmiumID) {
  if (redisClient) {
    await redisClient.DEL(`complete:${duosmiumID}`);
    await redisClient.DEL(`meta:${duosmiumID}`);
  }
  return prisma.result.delete({
    where: {
      duosmium_id: duosmiumID,
    },
  });
}

async function deleteAllResults() {
  if (redisClient) {
    const completeKeys = await redisClient.KEYS("complete:*");
    const metaKeys = await redisClient.KEYS("meta:*");
    for (const k of completeKeys) {
      await redisClient.DEL(k);
    }
    for (const k of metaKeys) {
      await redisClient.DEL(k);
    }
  }
  return prisma.result.deleteMany({});
}

async function addResultFromYAMLFile(file) {
  const yaml = await file.text();
  const obj = load(yaml);
  const interpreter = await getInterpreter(obj);
  const resultData = await createCompleteResultDataInput(interpreter);
  await addResult(resultData);
}

async function addResult(resultData) {
  if (redisClient) {
    await redisClient.DEL(`complete:${resultData["duosmium_id"]}`);
    await redisClient.DEL(`meta:${resultData["duosmium_id"]}`);
    await redisClient.DEL("resultsByLevel");
    await redisClient.DEL("seasons");
    await redisClient.DEL(`seasons:${resultData.tournament.year}`);
    await redisClient.DEL(
      `seasons:${resultData.tournament.year}:${resultData["duosmium_id"]}`,
    );
    await redisClient.DEL("latest");
    for (const tm of resultData.teams.connectOrCreate) {
      const { name, city, state, country } = tm.create;
      await redisClient.DEL(`rankings:${country}:${state}:${city}:${name}`);
    }
    // await redisClient.DEL("recent");
  }
  return prisma.result.upsert({
    where: {
      duosmium_id: resultData["duosmium_id"],
    },
    create: resultData,
    update: resultData,
  });
}

async function createResultDataInput(interpreter, logo = undefined) {
  const duosmiumID = generateFilename(interpreter);
  logo = logo ?? (await createLogoPath(duosmiumID, undefined));
  const title = fullTournamentTitle(interpreter.tournament);
  const shortTitle = fullTournamentTitleShort(interpreter.tournament);
  const date = dateString(interpreter);
  const tournament = interpreter.tournament.rep;
  const histogram = interpreter.histograms?.rep;
  return {
    logo: logo,
    title: title,
    short_title: shortTitle,
    date: date,
    duosmium_id: duosmiumID,
    tournament: tournament,
    histogram: histogram,
  };
}

async function createCompleteResultDataInput(interpreter, logo) {
  const duosmiumID = generateFilename(interpreter);
  // const tournamentData = await createTournamentDataInput(interpreter.tournament);
  const eventData = [];
  for (const event of interpreter.events) {
    const thisEventData = await createEventDataInput(event);
    eventData.push({
      create: thisEventData,
      where: {
        result_duosmium_id_name: {
          result_duosmium_id: duosmiumID,
          name: event.name,
        },
      },
    });
  }
  const trackData = [];
  for (const track of interpreter.tracks) {
    const thisTrackData = await createTrackDataInput(track);
    trackData.push({
      create: thisTrackData,
      where: {
        result_duosmium_id_name: {
          result_duosmium_id: duosmiumID,
          name: track.name.toString(),
        },
      },
    });
  }
  const teamData = [];
  for (const team of interpreter.teams) {
    const thisTeamData = await createTeamDataInput(team);
    teamData.push({
      create: thisTeamData,
      where: {
        result_duosmium_id_number: {
          result_duosmium_id: duosmiumID,
          number: team.number,
        },
      },
    });
  }
  const placingData = [];
  for (const placing of interpreter.placings) {
    const thisPlacingData = await createPlacingDataInput(placing, duosmiumID);
    placingData.push({
      create: thisPlacingData,
      where: {
        result_duosmium_id_event_name_team_number: {
          result_duosmium_id: duosmiumID,
          event_name: placing.event?.name,
          team_number: placing.team?.number,
        },
      },
    });
  }
  const penaltyData = [];
  for (const penalty of interpreter.penalties) {
    const thisPenaltyData = await createPenaltyDataInput(penalty, duosmiumID);
    penaltyData.push({
      create: thisPenaltyData,
      where: {
        result_duosmium_id_team_number: {
          result_duosmium_id: duosmiumID,
          team_number: penalty.team?.number,
        },
      },
    });
  }
  const output = await createResultDataInput(interpreter, logo);
  output["events"] = {
    connectOrCreate: eventData,
  };
  output["tracks"] = {
    connectOrCreate: trackData,
  };
  output["teams"] = {
    connectOrCreate: teamData,
  };
  output["placings"] = {
    connectOrCreate: placingData,
  };
  output["penalties"] = {
    connectOrCreate: penaltyData,
  };
  return output;
}

async function regenerateMetadata(duosmiumID) {
  const input = await createResultDataInput(
    await getInterpreter(await getCompleteResult(duosmiumID)),
  );
  if (redisClient) {
    await redisClient.DEL(`meta:${duosmiumID}`);
  }
  return prisma.result.update({
    where: { duosmium_id: duosmiumID },
    data: input,
  });
}

async function regenerateAllMetadata() {
  for (const result of await getAllResults()) {
    await regenerateMetadata(result.duosmium_id);
  }
}

async function getLatestResults(ascending = true, limit = 0) {
  if (redisClient) {
    const cachedLength = await redisClient.json.ARRLEN("latest");
    if (limit !== 0 && limit <= cachedLength) {
      return (await redisClient.json.GET("latest")).slice(0, limit);
    }
  }
  const output = await prisma.result.findMany({
    orderBy: [
      {
        created_at: "desc",
      },
      {
        duosmium_id: ascending ? "asc" : "desc",
      },
    ],
    select: {
      short_title: true,
      date: true,
      official: true,
      preliminary: true,
      duosmium_id: true,
    },
    take: limit === 0 ? undefined : limit,
  });
  if (redisClient) {
    await redisClient.json.SET("latest", "$", output);
  }
  return output;
}

async function countResultsByLevel(level) {
  return prisma.result.count({
    where: {
      tournament: {
        path: ["level"],
        equals: level,
      },
    },
  });
}

async function countAllResultsByLevel() {
  if (redisClient) {
    const cached = await redisClient.hGetAll("resultsByLevel");
    if (Object.keys(cached).length === 4) {
      const output = {};
      for (const k of Object.keys(cached)) {
        output[k] = Number(cached[k]);
      }
      return output;
    }
  }
  const output = {
    Invitational: await countResultsByLevel("Invitational"),
    Regionals: await countResultsByLevel("Regionals"),
    States: await countResultsByLevel("States"),
    Nationals: await countResultsByLevel("Nationals"),
  };
  if (redisClient) {
    redisClient.HSET("resultsByLevel", "Invitational", output.Invitational);
    redisClient.HSET("resultsByLevel", "Regionals", output.Regionals);
    redisClient.HSET("resultsByLevel", "States", output.States);
    redisClient.HSET("resultsByLevel", "Nationals", output.Nationals);
  }
  return output;
}

async function findBgColor(duosmiumID) {
  if (await resultExists(duosmiumID)) {
    const dbEntry = (await getResult(duosmiumID)).color;
    if (dbEntry) {
      return dbEntry;
    }
  }
  return await createBgColor(duosmiumID);
}

async function createBgColor(duosmiumID) {
  const logo = await findLogoPath(duosmiumID);
  return await createBgColorFromImagePath(logo);
}

async function createBgColorFromImagePath(imagePath, dark = false) {
  const logoData = (
    await supabase.storage
      .from("images")
      .download(imagePath.replace("/images/", ""))
  ).data;
  let output = defaultColor;
  if (logoData) {
    const arrayBuffer = await logoData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const builder = Vibrant.from(buffer);
    const extracted = await builder.getPalette();
    let possibleColors;
    if (dark) {
      possibleColors = [
        extracted.LightMuted,
        extracted.Muted,
        extracted.DarkMuted,
        extracted.LightVibrant,
        extracted.Vibrant,
        extracted.DarkVibrant,
      ].filter((color) => color != null);
    } else {
      possibleColors = [
        extracted.DarkVibrant,
        extracted.Vibrant,
        extracted.LightVibrant,
        extracted.DarkMuted,
        extracted.Muted,
        extracted.LightMuted,
      ].filter((color) => color != null);
    }
    if (possibleColors.length > 0) {
      const nearest = nearestColor.from(colors);
      output = nearest(possibleColors[0].hex).name;
      let order;
      let base;
      if (dark) {
        order = darkColorOrder;
        base = "#000000";
      } else {
        order = colorOrder;
        base = "#ffffff";
      }
      let currentNumber = getNumber(output);
      let currentColor = getColor(output);
      for (let i = 0; i < order.length; i++) {
        if (i < order.indexOf(currentNumber)) {
          continue;
        }
        currentNumber = order[i];
        const colorName = getFullName(currentColor, currentNumber);
        if (ContrastChecker.contrastRatio(base, colors[colorName]) >= 5.5) {
          break;
        }
      }
      output = getFullName(currentColor, currentNumber);
    }
  }
  return output;
}

function objectToYAML(obj) {
  return dump(obj).replaceAll("T00:00:00.000Z", "");
}

function objectToJSON(obj) {
  return JSON.stringify(obj).replaceAll("T00:00:00.000Z", "");
}

function exportYAMLOrJSON(url, obj, yamlName) {
  if (
    typeof url.searchParams.get("format") === "string" &&
    url.searchParams.get("format").toLowerCase() === "yaml"
  ) {
    const myYAMLOptions = YAML_OPTIONS;
    myYAMLOptions["headers"]["content-disposition"] =
      `attachment; filename=${yamlName}.yaml`;
    return new Response(objectToYAML(obj), myYAMLOptions);
  } else {
    return new Response(objectToJSON(obj), JSON_OPTIONS);
  }
}

function expandStateName(postalCode) {
  if (postalCode === undefined) {
    throw new Error("Postal code is undefined!");
  }
  return STATES_BY_POSTAL_CODE[postalCode];
}

function generateFilename(interpreter) {
  if (interpreter.tournament.startDate === undefined) {
    throw new Error("Tournament has no start date!");
  }
  let output = "";
  output += interpreter.tournament.startDate.getUTCFullYear();
  output +=
    "-" +
    (interpreter.tournament.startDate.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0");
  output +=
    "-" +
    interpreter.tournament.startDate.getUTCDate().toString().padStart(2, "0");
  switch (interpreter.tournament.level) {
    case "Nationals":
      output += "_nationals";
      break;
    case "States":
      output += `_${interpreter.tournament.state}_states`;
      break;
    case "Regionals":
      output += `_${interpreter.tournament.state}_${cleanString(
        getRelevantString(interpreter).toLowerCase().split("regional")[0],
      )}regional`;
      break;
    default:
      output += `_${cleanString(
        getRelevantString(interpreter).toLowerCase().split("invitational")[0],
      )}invitational`;
      break;
  }
  if (
    interpreter.tournament.level === "Regionals" ||
    interpreter.tournament.level === "Invitational"
  ) {
    const nameParts = getRelevantString(interpreter)
      .toLowerCase()
      .split(
        interpreter.tournament.level === "Regionals"
          ? "regional"
          : "invitational",
      );
    if (nameParts.length > 1) {
      for (let i = 1; i < nameParts.length; i++) {
        output += "_" + cleanString(nameParts[i].trim());
      }
      output = output.substring(0, output.length - 1);
    }
  }
  output += "_" + interpreter.tournament.division.toLowerCase();
  output = output.replace(/_+/g, "_");
  return output;
}

function cleanString(s) {
  let output = s.replaceAll(/\./g, "").replaceAll(/[^A-Za-z0-9]/g, "_");
  if (!output.endsWith("_")) {
    output += "_";
  }
  return output;
}

function tournamentTitle(tInfo) {
  if (tInfo.name) return tInfo.name;

  switch (tInfo.level) {
    case "Nationals":
      return "Science Olympiad National Tournament";
    case "States":
      return `${expandStateName(
        tInfo.state,
      )} Science Olympiad State Tournament`;
    case "Regionals":
      return `${tInfo.location} Regional Tournament`;
    case "Invitational":
      return `${tInfo.location} Invitational`;
  }
}

function tournamentTitleShort(tInfo) {
  switch (tInfo.level) {
    case "Nationals":
      return "National Tournament";
    case "States":
      return `${tInfo.state
        .replace("sCA", "SoCal")
        .replace("nCA", "NorCal")} State Tournament`;
    case "Regionals":
    case "Invitational":
      if (!tInfo.shortName && tInfo.name) {
        const cut = tInfo.level === "Regionals" ? "Regional" : "Invitational";
        const splits = tInfo.name.split(cut, 2)[0];
        return `${splits} ${cut}${cut === "Regional" ? " Tournament" : ""}`;
      }
      return tInfo.shortName;
  }
}

function formatSchool(team) {
  if (team.schoolAbbreviation) {
    return abbrSchool(team.schoolAbbreviation);
  }
  return abbrSchool(team.school);
}

function abbrSchool(school) {
  return (
    school
      // .replace('Elementary School', 'Elementary')
      .replace("Elementary School", "E.S.")
      .replace("Elementary/Middle School", "E.M.S.")
      .replace("Middle School", "M.S.")
      .replace("Junior High School", "J.H.S.")
      .replace(/Middle[ /-]High School/, "M.H.S")
      .replace("Junior/Senior High School", "Jr./Sr. H.S.")
      .replace("High School", "H.S.")
      // .replace('Secondary School', 'Secondary');
      .replace("Secondary School", "S.S.")
  );
}

function fullSchoolName(team) {
  return `${team.school} (${teamLocation(team)})`;
}

function fullTeamName(team) {
  return `${team.school} ${team.suffix ? team.suffix + " " : ""}(${teamLocation(
    team,
  )})`;
}

function teamLocation(team) {
  return team.city ? `${team.city}, ${team.state}` : `${team.state}`;
}

function dateString(i) {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthsOfYear = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (i.tournament.startDate && i.tournament.endDate) {
    let s = `${daysOfWeek[i.tournament.startDate.getUTCDay()]}, ${
      monthsOfYear[i.tournament.startDate.getUTCMonth()]
    } ${i.tournament.startDate.getUTCDate()}, ${i.tournament.startDate.getUTCFullYear()}`;
    const e = `${daysOfWeek[i.tournament.endDate.getUTCDay()]}, ${
      monthsOfYear[i.tournament.endDate.getUTCMonth()]
    } ${i.tournament.endDate.getUTCDate()}, ${i.tournament.endDate.getUTCFullYear()}`;
    if (s !== e) {
      s += " - " + e;
    }
    return s;
  }
  return "Your date is broken.";
}

function getRelevantString(i) {
  if (i.tournament.name === undefined && i.tournament.shortName === undefined) {
    throw new Error("Tournament has neither a name nor a short name!");
  } else if (
    i.tournament.name !== undefined &&
    i.tournament.shortName === undefined
  ) {
    return i.tournament.name;
  } else if (
    i.tournament.name !== undefined &&
    i.tournament.shortName !== undefined
  ) {
    return i.tournament.shortName;
  }
  return "";
}

function fullTournamentTitle(tournament) {
  return `${tournament.year} ${tournamentTitle(
    tournament,
  )} (Div. ${tournament.division.toUpperCase()})`;
}

function fullTournamentTitleShort(tournament) {
  return `${tournament.year} ${tournamentTitleShort(
    tournament,
  )} (Div. ${tournament.division.toUpperCase()})`;
}

function trophyAndMedalCss(trophies, medals, reverse = false) {
  return trophyAndMedalColors
    .map((color, i) => {
      let output = [];
      if (i < medals) {
        output.push(
          `td.event-points[data-points='${reverse ? reverse - i : i + 1}'] div`,
        );
        output.push(
          `td.event-points-focus[data-points='${
            reverse ? reverse - i : i + 1
          }'] div`,
        );
        output.push(
          `div#team-detail tr[data-points='${reverse ? reverse - i : i + 1}']`,
        );
      }
      if (i < trophies) {
        output.push(`td.rank[data-points='${i + 1}'] div`);
      }
      if (output.length > 0) {
        output =
          output.join(",") + `{background-color: ${color};border-radius: 1em;}`;
      }
      return output;
    })
    .join("");
}

function acronymize(phrase) {
  return phrase
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("");
}

function acronymizeFull(phrase) {
  return phrase
    .split(" ")
    .map((w) => w[0])
    .join("");
}

function keywords(interpreter) {
  const t = interpreter.tournament;
  const words = [
    t.name,
    t.shortName,
    t.location,
    t.name ? acronymize(t.name) : null,
    t.name ? acronymizeFull(t.name) : null,
    t.location && t.location.split(" ").length > 1
      ? acronymize(t.location)
      : null,
    t.name
      ? acronymize(t.name.replace("Tournament", "Science Olympiad"))
      : null,
    t.name
      ? acronymizeFull(t.name.replace("Tournament", "Science Olympiad"))
      : null,
    t.level,
    t.level === "Nationals" ? "nats" : null,
    t.level === "Nationals" ? "sont" : null,
    t.level === "Invitational" ? "invite" : null,
    t.level === "Regionals" ? "regs" : null,
    t.state,
    t.state ? expandStateName(t.state) : null,
    t.state === "nCA" ? "norcal" : null,
    t.state === "sCA" ? "socal" : null,
    t.state === "nCA" || t.state === "sCA" ? "california" : null,
    `div-${t.division}`,
    `division-${t.division}`,
    t.year,
    t.date ? t.date.toISOString().split("T")[0] : null,
    t.date
      ? t.date.toLocaleDateString(undefined, {
          weekday: "long",
          timeZone: "UTC",
        })
      : null,
    t.date
      ? t.date.toLocaleDateString(undefined, { month: "long", timeZone: "UTC" })
      : null,
    t.date ? t.date.getUTCDate() : null,
    t.date ? t.date.getUTCFullYear() : null,
    t.startDate ? t.startDate.toISOString().split("T")[0] : null,
    t.startDate
      ? t.startDate.toLocaleDateString(undefined, {
          weekday: "long",
          timeZone: "UTC",
        })
      : null,
    t.startDate
      ? t.startDate.toLocaleDateString(undefined, {
          month: "long",
          timeZone: "UTC",
        })
      : null,
    t.startDate ? t.startDate.getUTCDate() : null,
    t.startDate ? t.startDate.getUTCFullYear() : null,
    t.endDate ? t.endDate.toISOString().split("T")[0] : null,
    t.endDate
      ? t.endDate.toLocaleDateString(undefined, {
          weekday: "long",
          timeZone: "UTC",
        })
      : null,
    t.endDate
      ? t.endDate.toLocaleDateString(undefined, {
          month: "long",
          timeZone: "UTC",
        })
      : null,
    t.endDate ? t.endDate.getUTCDate() : null,
    t.endDate ? t.endDate.getUTCFullYear() : null,
    "science",
    "olympiad",
    "tournament",
    interpreter.histograms !== undefined ? "histograms" : null,
  ];
  return Array.from(
    words
      // split spaces, dedupe, convert to lowercase, remove nulls
      .reduce((acc, v) => {
        if (v) {
          v.toString()
            .split(" ")
            .forEach((w) => acc.add(w.toLowerCase()));
        }
        return acc;
      }, new Set()),
  ).join(" ");
}

function teamAttended(team) {
  return team.placings?.map((p) => p.participated).some((p) => p);
}

const summaryTitles = [
  "Champion",
  "Runner-up",
  "Third-place",
  "Fourth-place",
  "Fifth-place",
  "Sixth-place",
];

function supTag(placing) {
  const exempt = placing.exempt || placing.droppedAsPartOfWorstPlacings;
  const tie = placing.tie && !placing.pointsLimitedByMaximumPlace;
  if (tie || exempt) {
    return `<sup>${exempt ? "◊" : ""}${tie ? "*" : ""}</sup>`;
  }
  return "";
}

function bidsSupTag(team) {
  return team.earnedBid ? "<sup>✧</sup>" : "";
}

function bidsSupTagNote(tournament) {
  const nextTournament =
    tournament.level === "Regionals"
      ? `${tournament.state
          .replace("sCA", "SoCal")
          .replace("nCA", "NorCal")} State Tournament`
      : "National Tournament";
  const qualifiee = tournament.bidsPerSchool > 1 ? "team" : "school";
  return `Qualified ${qualifiee} for the ${tournament.year} ${nextTournament}`;
}

function placingNotes(placing) {
  const place = placing.place;
  const points = placing.isolatedPoints;
  return [
    placing.event.trial ? "trial event" : null,
    placing.event.trialed ? "trialed event" : null,
    placing.disqualified ? "disqualified" : null,
    placing.didNotParticipate ? "did not participate" : null,
    placing.participationOnly ? "participation points only" : null,
    placing.tie ? "tie" : null,
    placing.exempt ? "exempt" : null,
    placing.pointsLimitedByMaximumPlace ? "points limited" : null,
    placing.unknown ? "unknown place" : null,
    placing.pointsAffectedByExhibition && place - points === 1
      ? "placed behind exhibition team"
      : null,
    placing.pointsAffectedByExhibition && place - points > 1
      ? "placed behind exhibition teams"
      : null,
    placing.droppedAsPartOfWorstPlacings ? "dropped" : null,
  ]
    .flatMap((s) => (s ? [s[0].toUpperCase() + s.slice(1)] : []))
    .join(", ");
}

function teamsToStates(interpreter) {
  return Array.from(
    interpreter.teams.reduce((acc, t) => {
      acc.add(t.state);
      return acc;
    }, new Set()),
  ).sort((a, b) => a.localeCompare(b));
}

function fmtDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeDelta(time) {
  return Date.now() - time;
}

function escapeCsv(s) {
  if (typeof s !== "string") {
    return s;
  }
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function getInterpreter(source) {
  const int = (await Interpreter).default;
  return new int(source);
}

async function findLogoPath(duosmiumID, images = undefined) {
  if (await resultExists(duosmiumID)) {
    const dbEntry = (await getResult(duosmiumID)).logo;
    if (dbEntry) {
      return dbEntry;
    }
  }
  return await createLogoPath(duosmiumID, images);
}

async function createLogoPath(duosmiumID, images = undefined) {
  const tournamentYear = parseInt(duosmiumID.slice(0, 4));
  const tournamentName = duosmiumID.slice(11, -2).replace("_no_builds", "");
  const getYear = (image) => parseInt(image.match(/^\d+/)?.[0] ?? "0");

  images =
    images ??
    (
      await supabase.storage.from("images").list("logos", { limit: 1048576 })
    ).data?.map((img) => img.name);
  let selected;
  if (images == null) {
    selected = "default.jpg";
  } else {
    const sameDivision = images.filter((image) =>
      duosmiumID.endsWith(image.split(".")[0].match(/_[abc]$/)?.[0] ?? ""),
    );

    const hasTournName = sameDivision.filter(
      (image) =>
        image.startsWith(tournamentName) ||
        image.startsWith(tournamentYear + "_" + tournamentName),
    );

    // use state logo if regional logo does not exist
    let stateFallback = [];
    if (/_regional_[abc]$/.test(duosmiumID)) {
      const stateName = duosmiumID.split("_")[1] + "_states";
      stateFallback = sameDivision.filter((image) => image.includes(stateName));
    }

    // remove format info from name
    let withoutFormat = [];
    if (/(mini|satellite|in-person)_?(so)?_/.test(duosmiumID)) {
      const nameWithoutFormat = tournamentName.replace(
        /(mini|satellite|in-person)_?(so)?_/,
        "",
      );
      withoutFormat = sameDivision.filter((image) =>
        image.includes(nameWithoutFormat),
      );
    }

    const recentYear = hasTournName
      .concat(...withoutFormat, stateFallback, "default.jpg")
      .filter((image) => getYear(image) <= tournamentYear);
    selected = recentYear.reduce((prev, curr) => {
      const currentScore = getYear(curr) + curr.length / 100;
      const prevScore = getYear(prev) + prev.length / 100;
      return currentScore > prevScore ? curr : prev;
    });
  }
  return "/images/logos/" + selected;
}

async function addManyYAMLs(yamls) {
  const imageNames = await getLogoNames();
  const resultDataInputs = [];
  const times = new Map();
  for (let i = 0; i < yamls.length; i++) {
    const interpreter = await getInterpreter(yamls[i]);
    const duosmiumID = generateFilename(interpreter);
    const logo = await createLogoPath(duosmiumID, imageNames);
    times.set(duosmiumID, Date.now());
    const prom = createCompleteResultDataInput(interpreter, logo).then(
      (res) => {
        const newTime = Date.now();
        console.log(
          `Generated data for ${res.duosmium_id} in ${
            newTime - times.get(res.duosmium_id)
          } ms`,
        );
        times.set(res.duosmium_id, newTime);
        return res;
      },
    );
    resultDataInputs.push(prom);
  }
  const inputs = await Promise.all(resultDataInputs);
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    await addResult(input);
    console.log(
      `Added data for ${input.duosmium_id} in ${
        Date.now() - times.get(input.duosmium_id)
      } ms`,
    );
  }
}

async function getLogoNames() {
  if (redisClient) {
    const cachedLen = await redisClient.SCARD("logos");
    if (cachedLen > 0) {
      return await redisClient.SMEMBERS("logos");
    }
  }
  const output = (
    await supabase.storage.from("images").list("logos", { limit: 1048576 })
  ).data?.map((img) => img.name);
  if (redisClient) {
    for (const i of output) {
      await redisClient.SADD("logos", i);
    }
  }
  return output;
}

async function getTournamentTitles() {
  if (redisClient) {
    const cachedLen = await redisClient.HLEN("titles");
    if (cachedLen > 0) {
      return await redisClient.HGETALL("titles");
    }
  }
  const titles = await prisma.result.findMany({
    select: {
      duosmium_id: true,
      title: true,
    },
  });
  const output = {};
  for (const title of titles) {
    output[title.duosmium_id] = title.title;
  }
  if (redisClient) {
    for (const i of Object.keys(output)) {
      await redisClient.HSET("titles", i, output[i]);
    }
  }
  return output;
}

async function getAllSeasons() {
  if (redisClient) {
    const seasonLen = await redisClient.ZCARD("seasons");
    if (seasonLen > 0) {
      return (await redisClient.ZRANGE("seasons", 0, -1, { REV: true })).map(
        (s) => Number(s),
      );
    }
  }
  const allTournaments = await prisma.result.findMany({
    select: {
      duosmium_id: true,
      tournament: true,
    },
    orderBy: [
      {
        duosmium_id: "desc",
      },
    ],
  });
  const seasons = [];
  for (const t of allTournaments) {
    if (
      seasons.length > 0 &&
      seasons[seasons.length - 1] === t.tournament.year
    ) {
      continue;
    }
    seasons.push(t.tournament.year);
  }
  if (redisClient) {
    for (const season of seasons) {
      await redisClient.ZADD("seasons", {
        score: "1.0",
        value: season.toString(),
      });
    }
  }
  return seasons;
}

async function getTournamentsBySeason(season) {
  if (redisClient) {
    let cached = true;
    const numTournaments = await redisClient.ZCARD(`seasons:${season}`);
    if (numTournaments === 0) {
      cached = false;
    }
    const output = {};
    if (cached) {
      const tournamentList = await redisClient.ZRANGE(
        `seasons:${season}`,
        0,
        -1,
        { REV: true },
      );
      for (const tournament of tournamentList) {
        const tournamentExists =
          (await redisClient.HLEN(`seasons:${season}:${tournament}`)) === 6;
        if (!tournamentExists) {
          cached = false;
        }
        if (cached) {
          output[tournament] = await redisClient.HGETALL(
            `seasons:${season}:${tournament}`,
          );
          output[tournament].official = output[tournament].official === "true";
          output[tournament].preliminary =
            output[tournament].preliminary === "true";
        }
      }
    }
    if (cached) {
      return output;
    }
  }
  const output = {};
  const tournaments = await prisma.result.findMany({
    where: {
      tournament: {
        path: ["year"],
        equals: season,
      },
    },
    select: {
      duosmium_id: true,
      title: true,
      date: true,
      tournament: true,
      official: true,
      preliminary: true,
    },
    orderBy: [
      {
        duosmium_id: "desc",
      },
    ],
  });
  for (const r of tournaments) {
    output[r.duosmium_id] = {
      duosmium_id: r.duosmium_id,
      title: r.title,
      location: r.tournament.location,
      date: r.date,
      official: r.official,
      preliminary: r.preliminary,
    };
  }
  if (redisClient) {
    for (const k of Object.keys(output)) {
      await redisClient.ZADD(`seasons:${season}`, { score: "1.0", value: k });
      await redisClient.HSET(
        `seasons:${season}:${k}`,
        "duosmium_id",
        output[k].duosmium_id,
      );
      await redisClient.HSET(
        `seasons:${season}:${k}`,
        "title",
        output[k].title,
      );
      await redisClient.HSET(`seasons:${season}:${k}`, "date", output[k].date);
      await redisClient.HSET(
        `seasons:${season}:${k}`,
        "location",
        output[k].location,
      );
      await redisClient.HSET(
        `seasons:${season}:${k}`,
        "official",
        output[k].official.toString(),
      );
      await redisClient.HSET(
        `seasons:${season}:${k}`,
        "preliminary",
        output[k].preliminary.toString(),
      );
    }
  }
  return output;
}

async function getAllTournamentsBySeason() {
  const seasons = await getAllSeasons();
  const output = {};
  for (const season of seasons) {
    output[season] = await getTournamentsBySeason(season);
  }
  return output;
}

module.exports = {
  addManyYAMLs,
  addResult,
  getResult,
  getCompleteResult,
  deleteResult,
  deleteAllResults,
  getLatestResults,
  getAllCompleteResults,
  getAllResults,
  countAllResultsByLevel,
  addResultFromYAMLFile,
  regenerateMetadata,
  regenerateAllMetadata,
  resultExists,
  getLogoNames,
  getTournamentTitles,
  getAllSeasons,
  getTournamentsBySeason,
  getAllTournamentsBySeason,
  createCompleteResultDataInput,
  getInterpreter,
};
