const express = require("express");
const {
  getLatestResults,
  getAllCompleteResults,
  deleteAllResults,
  getAllResults,
  getCompleteResult,
  deleteResult,
  getResult,
  countAllResultsByLevel,
  regenerateMetadata,
  regenerateAllMetadata,
  resultExists,
  getTournamentTitles,
  getAllTournamentsBySeason,
  getTournamentsBySeason,
  addResult,
  getInterpreter,
  createCompleteResultDataInput,
} = require("../lib/results");
const { getUserFromJWT, isAdmin } = require("../lib/auth");
const {
  getAllFirstLetters,
  getSchoolRankingsCombinedName,
  getAllRankingsByLetter,
} = require("../lib/teams");
const router = express.Router();

/* MULTIPLE RESULTS */

/* Get all results */
router.get("/", async function (req, res) {
  const output = await getAllCompleteResults();
  res.json(output);
});

/* Add/update a result */
router.post("/", async function (req, res) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401).json();
    return;
  }
  if (isAdmin(user)) {
    const data = req.body;
    const prom = addResult(
      await createCompleteResultDataInput(await getInterpreter(data)),
    );
    res.status(202).json();
    await prom;
  } else {
    res.status(403).json();
  }
});

/* Delete all results */
router.delete("/", async function (req, res) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401).json();
    return;
  }
  if (isAdmin(user)) {
    const prom = deleteAllResults();
    res.status(202).json();
    await prom;
  } else {
    res.status(403).json();
  }
});

/* Get all results' metadata */
router.get("/meta", async function (req, res) {
  const output = await getAllResults();
  res.json(output);
});

/* Regenerate all results' metadata */
router.post("/meta", async function (req, res) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401).json();
    return;
  }
  if (isAdmin(user)) {
    const prom = regenerateAllMetadata();
    res.status(202).json();
    await prom;
  } else {
    res.status(403).json();
  }
});

/* Get most recently added results */
router.get("/latest", async function (req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const output = await getLatestResults(false, limit);
  res.json(output);
});

/* Get most recent (by date occurred) results */
router.get("/recent", async function (req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 24;
  const output = await getAllResults(false, limit);
  res.json(output);
});

/* Count results by level */
router.get("/count", async function (req, res) {
  const output = await countAllResultsByLevel();
  res.json(output);
});

/* Get all tournament titles */
router.get("/titles", async function (req, res) {
  const output = await getTournamentTitles();
  res.json(output);
});

/* Get all results' title, date, and location, by season */
router.get("/seasons", async function (req, res) {
  const output = await getAllTournamentsBySeason();
  res.json(output);
});

/* Get all results' title, date, and location, for a specific season */
router.get("/seasons/:season", async function (req, res) {
  const output = await getTournamentsBySeason(Number(req.params.season));
  res.json(output);
});

/* INDIVIDUAL RESULTS */

/* Get a result */
router.get("/:id", async function (req, res) {
  if (await resultExists(req.params.id)) {
    const output = await getCompleteResult(req.params.id);
    res.json(output);
  } else {
    res.status(404).json();
  }
});

/* Delete a result */
router.delete("/:id", async function (req, res) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401).json();
    return;
  }
  if (isAdmin(user)) {
    if (await resultExists(req.params.id)) {
      const prom = deleteResult(req.params.id);
      res.status(202).json();
      await prom;
    } else {
      res.status(404).json();
    }
  } else {
    res.status(403).json();
  }
});

/* Get a result's metadata */
router.get("/:id/meta", async function (req, res) {
  if (await resultExists(req.params.id)) {
    const output = await getResult(req.params.id);
    res.json(output);
  } else {
    res.status(404).json();
  }
});

/* Regenerate a result's metadata */
router.post("/:id/meta", async function (req, res) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401).json();
    return;
  }
  if (isAdmin(user)) {
    if (await resultExists(req.params.id)) {
      const prom = regenerateMetadata(req.params.id);
      res.status(202).json();
      await prom;
    } else {
      res.status(404).json();
    }
  } else {
    res.status(403).json();
  }
});

/* Get a superscored result */
router.get("/:id/superscore", async function (req, res) {
  res.status(405).json();
});

/* SCHOOLS */

/* Get all starting letters of schools */
router.get("/schools/letters", async function (req, res) {
  const output = await getAllFirstLetters();
  res.json(output);
});

/* Get all rankings for all schools starting with a certain letter */
router.get("/schools/letters/:letter", async function (req, res) {
  if (req.params.letter.length !== 1) {
    res.status(400).json();
  } else {
    try {
      const output = await getAllRankingsByLetter(req.params.letter);
      res.json(output);
    } catch (e) {
      if (e.message.endsWith("No results!")) {
        res.status(404).json();
      } else {
        res.status(500).json();
      }
    }
  }
});

/* Get all rankings for a single school */
router.get("/schools/:name", async function (req, res) {
  try {
    const output = await getSchoolRankingsCombinedName(req.params.name);
    res.json(output);
  } catch (e) {
    if (e.message.endsWith("is not a valid school name!")) {
      res.status(400).json();
    } else if (e.message.endsWith("This is not a real school!")) {
      res.status(404).json();
    } else {
      res.status(500).json();
    }
  }
});

module.exports = router;
