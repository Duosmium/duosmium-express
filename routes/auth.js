const express = require("express");
const {login, logout} = require("../lib/auth");
const router = express.Router();

/* Login */
router.post("/login", async function (req, res) {
    if (!req.body.email || !req.body.password) {
        res.status(400);
    } else {
        try {
            const output = await login(req.body.email, req.body.password);
            res.json(output);
        } catch (e) {
            res.status(401);
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

module.exports = router;
