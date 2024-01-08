const express = require("express");
const { login, logout, getUserFromJWT, isAdmin, refresh } = require("../lib/auth");
const router = express.Router();

/* Login */
router.post("/login", async function (req, res) {
  if (!req.body.email || !req.body.password) {
    res.status(400).json();
  } else {
    try {
      const output = await login(req.body.email, req.body.password);
      res.json(output);
    } catch (e) {
      res.status(401).json();
    }
  }
});

/* Logout */
router.post("/logout", async function (req, res) {
  const jwt = req.get("Authorization").split(" ")[1];
  try {
    await logout(jwt);
    res.status(205);
  } catch (e) {
    res.status(500);
  }
});

/* Check if admin */
router.post("/admin", async function (req, res) {
  const jwt = req.get("Authorization").split(" ")[1];
  const user = await getUserFromJWT(jwt);
  res.json({admin: isAdmin(user)});
})

/* Refresh session */
router.post("/refresh", async function (req, res) {
  if (!req.body.refresh_token) {
    res.status(400).json();
  } else {
    try {
      const output = await refresh(req.body);
      res.json(output);
    } catch (e) {
      res.status(401).json();
    }
  }
});

module.exports = router;
