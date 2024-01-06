const express = require("express");
const router = express.Router();
const { getLogoNames } = require("../lib/results");

/* Welcome message */
router.get("/", async function (req, res, next) {
  res.send({ message: "Welcome to the Duosmium API!" });
});

/* List of logos */
router.get("/logos", async function (req, res, next) {
  const output = await getLogoNames();
  res.json(output);
});

module.exports = router;
