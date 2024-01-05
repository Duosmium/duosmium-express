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
    resultExists
} = require("../lib/results");
const { getUserFromJWT, isAdmin } = require("../lib/auth");
const router = express.Router();

/* MULTIPLE RESULTS */

/* Get all results */
router.get("/", async function (req, res, next) {
  const output = await getAllCompleteResults();
  res.json(output);
});

/* Add/update a result */
router.post("/", async function (req, res, next) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401);
    return;
  }
  if (isAdmin(user)) {
    res.status(405);
  } else {
    res.status(403);
  }
});

/* Delete all results */
router.delete("/", async function (req, res, next) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401);
    return;
  }
  if (isAdmin(user)) {
    const output = await deleteAllResults();
    res.json(output);
  } else {
    res.status(403);
  }
});

/* Get all results' metadata */
router.get("/meta", async function (req, res, next) {
  const output = await getAllResults();
  res.json(output);
});

/* Regenerate all results' metadata */
router.post("/meta", async function (req, res, next) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401);
    return;
  }
  if (isAdmin(user)) {
    regenerateAllMetadata();
    res.status(202);
  } else {
    res.status(403);
  }
});

/* Get most recently added results */
router.get("/latest", async function (req, res, next) {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const output = await getLatestResults(false, limit);
  res.json(output);
});

/* Get most recent (by date occurred) results */
router.get("/recent", async function (req, res, next) {
  const limit = req.query.limit ? Number(req.query.limit) : 24;
  const output = await getAllResults(false, limit);
  res.json(output);
});

/* Count results by level */
router.get("/count", async function (req, res) {
  const output = await countAllResultsByLevel();
  res.json(output);
});

/* INDIVIDUAL RESULTS */

/* Get a result */
router.get("/:id", async function (req, res, next) {
  if (!(await resultExists(req.params.id))) {
    res.status(404);
  }
  else {
    const output = await getCompleteResult(req.params.id);
    res.json(output);
  }
});

/* Delete a result */
router.delete("/:id", async function (req, res, next) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401);
    return;
  }
  if (isAdmin(user)) {
    const output = await deleteResult(req.params.id);
    res.json(output);
  } else {
    res.status(403);
  }
});

/* Get a result's metadata */
router.get("/:id/meta", async function (req, res, next) {
  const output = await getResult(req.params.id);
  res.json(output);
});

/* Regenerate a result's metadata */
router.post("/:id/meta", async function (req, res, next) {
  let user;
  try {
    user = await getUserFromJWT(req.get("Authorization").split(" ")[1]);
  } catch (e) {
    res.status(401);
    return;
  }
  if (isAdmin(user)) {
    regenerateMetadata(req.params.id);
    res.status(202);
  } else {
    res.status(403);
  }
});

/* Get a superscored result */
router.get("/:id/superscore", async function (req, res, next) {
  res.status(405);
});

module.exports = router;
